from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from core.database import get_db
from ai.schemas import (
    AgentChatRequest,
    KnowledgeUpsertRequest,
    RequestMatchAgentRequest,
)
from ai.agent import (
    process_ai_chat_request,
    process_public_chat_request,
    process_match_request,
)
from ai.rag import upsert_knowledge

router = APIRouter(tags=["AI Flow"])


def clean_doc(doc: dict | None) -> dict | None:
    if not doc:
        return doc
    clean = dict(doc)
    if "_id" in clean:
        clean["_id"] = str(clean["_id"])
    return clean


def clean_docs(docs) -> list:
    return [clean_doc(d) for d in docs]


# ---------- AI Chat & Notification Endpoints ----------

@router.post("/api/ai/chat")
@router.post("/ai/chat")
async def ai_chat_assistant(payload: AgentChatRequest, db=Depends(get_db)):
    result = await process_ai_chat_request(payload.message, db)
    if payload.user_id:
        ai_history_col = db["ai_chat_history"]
        history_doc = {
            "user_id": payload.user_id,
            "message": payload.message,
            "reply": result.get("reply", ""),
            "matching_count": result.get("matching_count", 0),
            "donors": result.get("donors", []),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        ai_history_col.insert_one(history_doc)
    return result


@router.get("/api/ai/chat/history/{user_id}")
@router.get("/ai/chat/history/{user_id}")
async def get_ai_chat_history(user_id: int, db=Depends(get_db)):
    ai_history_col = db["ai_chat_history"]
    history = ai_history_col.find({"user_id": user_id})
    history = sorted(history, key=lambda x: str(x.get("created_at", "")))
    return {"history": clean_docs(history)}


@router.post("/api/ai/public-chat")
@router.post("/ai/public-chat")
async def ai_public_chat_assistant(payload: AgentChatRequest, db=Depends(get_db)):
    result = await process_public_chat_request(payload.message, db)
    return result


@router.post("/api/ai/match-request")
@router.post("/ai/match-request")
async def ai_match_request(payload: RequestMatchAgentRequest):
    req_dict = getattr(payload, "request", None) or {
        "blood_group": getattr(payload, "blood_type", "O+"),
        "location": getattr(payload, "location", "Dhaka"),
    }
    donors_list = getattr(payload, "donors", []) or []
    msg = getattr(payload, "notes", "Verify match suitability") or "Verify match suitability"
    result = await process_match_request(req_dict, donors_list, msg)
    return result


@router.post("/api/ai/knowledge")
@router.post("/ai/knowledge")
async def ai_upsert_knowledge(payload: KnowledgeUpsertRequest):
    try:
        doc = getattr(payload, "document", None) or getattr(payload, "text", "")
        cat = getattr(payload, "category", None) or getattr(payload, "source", "blood-bank-policy")
        record_id = await upsert_knowledge(doc, cat)
        return {"status": "success", "record_id": record_id}
    except RuntimeError as err:
        raise HTTPException(status_code=400, detail=str(err))
