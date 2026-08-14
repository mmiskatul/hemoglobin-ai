from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import get_ai_settings
from db import get_db
from schemas import (
    AgentChatRequest,
    KnowledgeUpsertRequest,
    RequestMatchAgentRequest,
)
from agent import (
    execute_ai_chat,
    execute_public_chat,
    execute_match_request,
)
from rag import upsert_knowledge

settings = get_ai_settings()

app = FastAPI(
    title="Smart Blood Hub - Standalone AI System Microservice",
    description="Dedicated microservice providing LLM reasoning, donor dispatch recommendations, and Pinecone RAG knowledge retrieval",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clean_doc(doc: dict | None) -> dict | None:
    if not doc:
        return doc
    clean = dict(doc)
    if "_id" in clean:
        clean["_id"] = str(clean["_id"])
    return clean


def clean_docs(docs) -> list:
    return [clean_doc(d) for d in docs]


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "blood-hub-ai-system",
        "openai_configured": bool(settings.openai_api_key),
        "pinecone_configured": bool(settings.pinecone_api_key),
    }


@app.post("/ai/chat")
@app.post("/api/ai/chat")
async def ai_chat_endpoint(payload: AgentChatRequest, db=Depends(get_db)):
    result = await execute_ai_chat(payload.message, db=db)
    if payload.user_id:
        try:
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
        except Exception:
            pass
    return result


@app.get("/ai/chat/history/{user_id}")
@app.get("/api/ai/chat/history/{user_id}")
async def ai_chat_history_endpoint(user_id: int, db=Depends(get_db)):
    try:
        ai_history_col = db["ai_chat_history"]
        history = ai_history_col.find({"user_id": user_id})
        history = sorted(history, key=lambda x: str(x.get("created_at", "")))
        return {"history": clean_docs(history)}
    except Exception:
        return {"history": []}


@app.post("/ai/public-chat")
@app.post("/api/ai/public-chat")
async def ai_public_chat_endpoint(payload: AgentChatRequest, db=Depends(get_db)):
    return await execute_public_chat(payload.message, db=db)


@app.post("/ai/match-request")
@app.post("/api/ai/match-request")
async def ai_match_request_endpoint(payload: RequestMatchAgentRequest):
    req_dict = {
        "blood_group": getattr(payload, "blood_type", "O+"),
        "location": getattr(payload, "location", "Dhaka"),
        "urgency": getattr(payload, "urgency", "CRITICAL"),
        "hospital_name": getattr(payload, "hospital_name", "General Hospital"),
    }
    donors = getattr(payload, "donors", []) or []
    msg = getattr(payload, "notes", "") or "Verify match suitability"
    return await execute_match_request(req_dict, donors, msg)


@app.post("/ai/knowledge")
@app.post("/api/ai/knowledge")
async def ai_upsert_knowledge_endpoint(payload: KnowledgeUpsertRequest):
    try:
        record_id = await upsert_knowledge(payload.document, payload.category)
        return {"status": "success", "record_id": record_id}
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
