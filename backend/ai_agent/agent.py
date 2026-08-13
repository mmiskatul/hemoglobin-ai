import os
import re
import json
from openai import AsyncOpenAI
from ai_agent.config import get_ai_settings
from ai_agent.database import get_db
from ai_agent.rag import retrieve_context
from ai_agent.emailer import send_donor_notification

BLOOD_GROUPS = ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"]


def parse_blood_request(text: str) -> tuple[str | None, str | None]:
    """
    Parses blood group and location keywords from free-form user query.
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
    Determines if user message is requesting a blood search, donor lookup, or system data analysis.
    """
    if blood_group or location:
        return True
    msg_lower = message.lower()
    search_keywords = {
        "need", "find", "search", "donor", "donors", "blood", "urgent", "urgently",
        "emergency", "available", "analyze", "analysis", "stats", "statistics",
        "details", "inventory", "hospital", "patient", "list", "lookup", "request"
    }
    return any(kw in msg_lower for kw in search_keywords)


async def process_ai_chat_request(message: str, db) -> dict:
    """
    Main AI logic:
    1. Detects user intent (conversational greeting vs blood/donor data search).
    2. For conversational messages: responds warmly without dumping raw database reports.
    3. For blood/donor search requests: queries MongoDB Atlas, notifies matching donors via Gmail SMTP, and provides detailed data analysis.
    """
    blood_group, location = parse_blood_request(message)
    is_search = is_blood_search_intent(message, blood_group, location)

    donors_col = db["donors"]
    posts_col = db["posts"]
    logs_col = db["notification_logs"]

    # If conversational greeting (not requesting blood or donor data)
    if not is_search:
        greeting_reply = (
            "Hello! 👋 I am your Smart Blood Hub AI Coordinator.\n\n"
            "I am connected live to our verified donor registry and emergency dispatch engine. "
            "I can help you search for blood donors, analyze database statistics, or answer blood compatibility questions.\n\n"
            "How can I help you today? Try asking me:\n"
            "• 'Find available O+ blood in Sylhet'\n"
            "• 'Analyze database donor statistics'\n"
            "• 'Who can receive A+ blood?'"
        )
        return {
            "reply": greeting_reply,
            "matching_count": 0,
            "notifications_sent": 0,
            "donors": [],
            "rag_context_used": False,
        }

    # Gather system statistics for data queries
    total_donors = donors_col.count_documents({}) if hasattr(donors_col, "count_documents") else len(list(donors_col.find({})))
    available_donors = donors_col.count_documents({"is_available": True}) if hasattr(donors_col, "count_documents") else len(list(donors_col.find({"is_available": True})))
    total_posts = posts_col.count_documents({}) if hasattr(posts_col, "count_documents") else len(list(posts_col.find({})))
    total_dispatches = logs_col.count_documents({}) if hasattr(logs_col, "count_documents") else len(list(logs_col.find({})))

    # Group availability breakdown
    all_donors = list(donors_col.find({}))
    group_counts = {}
    for d in all_donors:
        bg = d.get("blood_group", "Unknown")
        group_counts[bg] = group_counts.get(bg, 0) + (1 if d.get("is_available", True) else 0)

    # Search matching donors
    query = {"is_available": True}
    if blood_group:
        query["blood_group"] = blood_group
    if location:
        query["location"] = {"$regex": location, "$options": "i"}

    matching_donors = list(donors_col.find(query))

    dispatched_notifications = []
    donor_dicts = []
    for d in matching_donors:
        donor_dict = {
            "id": d.get("id", d.get("_id")),
            "name": d["name"],
            "email": d["email"],
            "phone": d.get("phone", "N/A"),
            "blood_group": d["blood_group"],
            "location": d["location"],
        }
        donor_dicts.append(donor_dict)

        # Trigger SMTP email alert if specific query provided
        if blood_group or location:
            notif = await send_donor_notification(
                donor=donor_dict,
                blood_group=blood_group or d["blood_group"],
                location=location or d["location"],
                requester_message=message,
                db=db,
            )
            dispatched_notifications.append(notif)

    settings = get_ai_settings()
    rag_facts = await retrieve_context(message, top_k=3)

    # Build structured data analysis
    donor_details_text = ""
    if donor_dicts:
        donor_details_text = "\n".join([
            f"  • {d['name']} | Blood Group: {d['blood_group']} | Location: {d['location']} | Phone: {d['phone']} | Email: {d['email']}"
            for d in donor_dicts
        ])
    else:
        donor_details_text = "  • No matching available donors found for this exact criteria."

    group_breakdown_text = ", ".join([f"{bg}: {cnt}" for bg, cnt in group_counts.items()]) or "No breakdown available"

    full_data_analysis = (
        f"🤖 AI Emergency Blood Analysis Report\n\n"
        f"📊 System Data Overview:\n"
        f"  • Total Registered Donors: {total_donors}\n"
        f"  • Active Ready Donors: {available_donors}\n"
        f"  • Total Emergency Posts: {total_posts}\n"
        f"  • Total SMTP Emergency Dispatches: {total_dispatches}\n"
        f"  • Available Donors by Blood Group: {group_breakdown_text}\n\n"
        f"🎯 Query Match Analysis:\n"
        f"  • Requested Blood Group: {blood_group or 'ALL'}\n"
        f"  • Requested Location: {location or 'ALL'}\n"
        f"  • Matching Donors Found: {len(donor_dicts)}\n\n"
        f"📋 Detailed Verified Matching Donors:\n"
        f"{donor_details_text}\n\n"
        f"🚀 Automated Actions Executed:\n"
        f"  • Dispatched Gmail SMTP emergency alert notifications to {len(dispatched_notifications)} matching donor(s).\n"
        f"  • Audit log entries recorded in MongoDB Atlas."
    )

    if not settings.openai_api_key:
        return {
            "reply": full_data_analysis,
            "matching_count": len(matching_donors),
            "notifications_sent": len(dispatched_notifications),
            "donors": donor_dicts,
            "rag_context_used": len(rag_facts) > 0,
        }

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        rag_prompt = f"\nRelevant Protocol Knowledge:\n" + "\n".join(rag_facts) if rag_facts else ""
        completion = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are the Smart Blood Hub AI Coordinator. Help users search for blood donors. "
                        "When requested, provide a structured breakdown of matching donors and system details. "
                        "Never diagnose medical conditions."
                        f"{rag_prompt}"
                    )
                },
                {"role": "user", "content": f"Database Analysis:\n{full_data_analysis}\n\nUser Query: {message}"}
            ],
            max_tokens=600
        )
        ai_reply = completion.choices[0].message.content
    except Exception:
        ai_reply = full_data_analysis

    return {
        "reply": ai_reply,
        "matching_count": len(matching_donors),
        "notifications_sent": len(dispatched_notifications),
        "donors": donor_dicts,
        "rag_context_used": len(rag_facts) > 0,
    }


async def process_public_chat_request(message: str, db) -> dict:
    """
    Public-facing AI assistant endpoint for donor availability and blood donation guidance.
    """
    blood_group, location = parse_blood_request(message)
    donors_col = db["donors"]
    query = {"is_available": True}
    if blood_group:
        query["blood_group"] = blood_group
    if location:
        query["location"] = {"$regex": location, "$options": "i"}

    matching = list(donors_col.find(query))
    count = len(matching)

    rag_facts = await retrieve_context(message, top_k=3)
    settings = get_ai_settings()

    if not settings.openai_api_key:
        reply = (
            f"Hello! There are currently {count} active registered donor(s) "
            + (f"matching {blood_group} " if blood_group else "")
            + (f"in {location}." if location else "in our system.")
            + "\nFor emergency dispatches, please register a request or use the main chat assistant."
        )
        return {"reply": reply, "active_donors_found": count}

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        rag_prompt = f"\nRelevant Protocol Knowledge:\n" + "\n".join(rag_facts) if rag_facts else ""
        completion = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are the Public Smart Blood Hub Assistant. Answer donor availability and blood donation questions helpfuly. "
                        "Do not share personal donor contact info publicly. Never provide direct medical diagnoses."
                        f"{rag_prompt}"
                    ),
                },
                {"role": "user", "content": f"Active available count: {count}\nUser query: {message}"},
            ],
            max_tokens=300,
        )
        reply = completion.choices[0].message.content
    except Exception:
        reply = f"There are currently {count} active registered donor(s) matching your area/group request."

    return {"reply": reply, "active_donors_found": count}


async def process_match_request(request_data: dict, donors: list[dict], message: str) -> dict:
    """
    Generates structured AI recommendations for a specific blood request and a candidate pool of donors.
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
                {
                    "role": "system",
                    "content": "You are an AI logistics dispatch coordinator for blood donation. Summarize matching donor suitability.",
                },
                {
                    "role": "user",
                    "content": f"Request Details: {json.dumps(request_data)}\nDonors: {json.dumps(donors)}\nInstructions: {message}",
                },
            ],
            max_tokens=250,
        )
        reply = completion.choices[0].message.content
    except Exception:
        reply = f"✅ {summary}"

    return {"reply": reply, "match_count": len(donors), "recommendation": reply}

