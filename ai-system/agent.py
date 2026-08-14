import re
import json
import logging
from openai import AsyncOpenAI
from config import get_ai_settings
from rag import retrieve_context
from prompts import (
    AI_COORDINATOR_SYSTEM_PROMPT,
    AI_PUBLIC_ASSISTANT_PROMPT,
    AI_LOGISTICS_COORDINATOR_PROMPT,
)

logger = logging.getLogger("ai_system.agent")

BLOOD_GROUPS = ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"]


def parse_blood_request(text: str) -> tuple[str | None, str | None]:
    """
    Extracts target blood group and location entity from natural language text.
    """
    text_upper = text.upper()
    found_group = None
    for bg in sorted(BLOOD_GROUPS, key=len, reverse=True):
        if bg in text_upper:
            found_group = bg
            break

    stopwords = {
        "need", "blood", "urgent", "urgently", "please", "help", "donor", "donors",
        "want", "find", "seeking", "emergency", "unit", "units", "hospital", "patient",
        "info", "give", "some", "require", "required", "near", "around", "desk",
        "available", "looking", "there", "any", "have", "with", "from", "for",
        "hello", "hi", "hey", "greetings", "good", "morning", "afternoon", "evening",
        "thanks", "thank", "you", "ai", "agent", "assistant", "bot", "what", "can", "do", "how"
    }

    words = text.split()
    location = None
    for word in words:
        clean = re.sub(r"[^\w\s]", "", word).strip()
        if len(clean) >= 3 and clean.lower() not in stopwords and not any(bg in clean.upper() for bg in BLOOD_GROUPS):
            location = clean
            break

    return found_group, location


def is_blood_search_intent(message: str, blood_group: str | None, location: str | None) -> bool:
    """
    Detects if query is requesting donor lookups or blood inventory analysis.
    """
    if blood_group or location:
        return True
    msg_lower = message.lower()
    keywords = {
        "need", "find", "search", "donor", "donors", "blood", "urgent", "urgently",
        "emergency", "available", "analyze", "analysis", "stats", "statistics",
        "details", "inventory", "hospital", "patient", "list", "lookup", "request"
    }
    return any(kw in msg_lower for kw in keywords)


async def execute_ai_chat(message: str, db=None) -> dict:
    """
    Processes chat requests with LLM intelligence, donor queries, and RAG context.
    """
    blood_group, location = parse_blood_request(message)
    is_search = is_blood_search_intent(message, blood_group, location)

    if not is_search:
        greeting = (
            "Hello! 👋 I am your Smart Blood Hub AI Coordinator.\n\n"
            "I can assist you with:\n"
            "• Searching verified blood donors by group and location\n"
            "• Real-time blood inventory and emergency stats\n"
            "• Blood compatibility guidance and donation protocols\n\n"
            "How can I help you today?"
        )
        return {
            "reply": greeting,
            "matching_count": 0,
            "notifications_sent": 0,
            "donors": [],
            "rag_context_used": False,
        }

    donors = []
    if db is not None:
        try:
            donors_col = db["donors"]
            q = {"is_available": True}
            if blood_group:
                q["blood_group"] = blood_group
            if location:
                q["location"] = {"$regex": location, "$options": "i"}
            donors = list(donors_col.find(q))
        except Exception as err:
            logger.warning(f"Database query error: {err}")

    donor_dicts = [
        {
            "id": d.get("id", str(d.get("_id", ""))),
            "name": d.get("name", "Verified Donor"),
            "blood_group": d.get("blood_group", "Unknown"),
            "location": d.get("location", "Unknown"),
            "phone": d.get("phone", "N/A"),
            "email": d.get("email", "N/A"),
        }
        for d in donors
    ]

    rag_facts = await retrieve_context(message, top_k=3)
    settings = get_ai_settings()

    summary_text = (
        f"🤖 AI Emergency Blood Analysis Report:\n"
        f"• Target Group: {blood_group or 'ALL'}\n"
        f"• Location: {location or 'ALL'}\n"
        f"• Verified Available Matches: {len(donor_dicts)}\n"
    )

    if not settings.openai_api_key:
        return {
            "reply": summary_text,
            "matching_count": len(donor_dicts),
            "notifications_sent": 0,
            "donors": donor_dicts,
            "rag_context_used": len(rag_facts) > 0,
        }

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        rag_prompt = f"\nRelevant Protocol Knowledge:\n" + "\n".join(rag_facts) if rag_facts else ""
        completion = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": AI_COORDINATOR_SYSTEM_PROMPT + rag_prompt},
                {"role": "user", "content": f"Database Summary:\n{summary_text}\n\nUser Query: {message}"}
            ],
            max_tokens=600,
        )
        ai_reply = completion.choices[0].message.content
    except Exception as err:
        logger.warning(f"OpenAI completion error: {err}")
        ai_reply = summary_text

    return {
        "reply": ai_reply,
        "matching_count": len(donor_dicts),
        "notifications_sent": 0,
        "donors": donor_dicts,
        "rag_context_used": len(rag_facts) > 0,
    }


async def execute_public_chat(message: str, db=None) -> dict:
    """
    Public guidance chat endpoint.
    """
    blood_group, location = parse_blood_request(message)
    count = 0
    if db is not None:
        try:
            donors_col = db["donors"]
            q = {"is_available": True}
            if blood_group:
                q["blood_group"] = blood_group
            if location:
                q["location"] = {"$regex": location, "$options": "i"}
            count = donors_col.count_documents(q) if hasattr(donors_col, "count_documents") else len(list(donors_col.find(q)))
        except Exception:
            count = 0

    rag_facts = await retrieve_context(message, top_k=3)
    settings = get_ai_settings()

    if not settings.openai_api_key:
        reply = f"Hello! There are currently {count} active registered donor(s) in our network."
        return {"reply": reply, "active_donors_found": count}

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        rag_prompt = f"\nRelevant Protocol Knowledge:\n" + "\n".join(rag_facts) if rag_facts else ""
        completion = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": AI_PUBLIC_ASSISTANT_PROMPT + rag_prompt},
                {"role": "user", "content": f"Active available donor count: {count}\nUser query: {message}"},
            ],
            max_tokens=300,
        )
        reply = completion.choices[0].message.content
    except Exception:
        reply = f"There are currently {count} active registered donor(s) matching your request."

    return {"reply": reply, "active_donors_found": count}


async def execute_match_request(request_data: dict, donors: list[dict], message: str) -> dict:
    """
    AI donor matching and dispatch priority recommendation.
    """
    settings = get_ai_settings()
    summary = f"Matching {len(donors)} donor candidate(s) for blood request ({request_data.get('blood_group', 'N/A')} in {request_data.get('location', 'N/A')})."

    if not settings.openai_api_key:
        return {
            "reply": f"✅ {summary} Dispatches ready.",
            "match_count": len(donors),
            "recommendation": "Notify all verified local donors immediately.",
        }

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        completion = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": AI_LOGISTICS_COORDINATOR_PROMPT},
                {"role": "user", "content": f"Request: {json.dumps(request_data)}\nDonors: {json.dumps(donors)}\nNotes: {message}"},
            ],
            max_tokens=250,
        )
        reply = completion.choices[0].message.content
    except Exception:
        reply = f"✅ {summary}"

    return {"reply": reply, "match_count": len(donors), "recommendation": reply}
