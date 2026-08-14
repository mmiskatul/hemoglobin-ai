from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from core.database import get_db
from schemas.message import DirectMessageCreate

router = APIRouter(tags=["Direct Messaging"])


def clean_doc(doc: dict | None) -> dict | None:
    if not doc:
        return doc
    clean = dict(doc)
    if "_id" in clean:
        clean["_id"] = str(clean["_id"])
    return clean


def clean_docs(docs) -> list:
    return [clean_doc(d) for d in docs]


@router.get("/api/messages/conversations/{user_id}")
async def list_conversations(user_id: int, db=Depends(get_db)):
    messages_col = db["direct_messages"]
    msgs = messages_col.find({"$or": [{"sender_id": user_id}, {"receiver_id": user_id}]})
    msgs = sorted(msgs, key=lambda x: str(x.get("sent_at", "")), reverse=True)

    contacts_map = {}
    for m in msgs:
        other_id = m["receiver_id"] if m["sender_id"] == user_id else m["sender_id"]
        other_name = m["receiver_name"] if m["sender_id"] == user_id else m["sender_name"]
        if other_id not in contacts_map:
            contacts_map[other_id] = {
                "id": other_id,
                "name": other_name,
                "last_message": m["message"],
                "last_sent_at": m.get("sent_at", ""),
            }
    return {"conversations": list(contacts_map.values())}


@router.get("/api/messages/{sender_id}/{receiver_id}")
async def get_chat_history(sender_id: int, receiver_id: int, db=Depends(get_db)):
    messages_col = db["direct_messages"]
    msgs = messages_col.find({
        "$or": [
            {"sender_id": sender_id, "receiver_id": receiver_id},
            {"sender_id": receiver_id, "receiver_id": sender_id},
        ]
    })
    msgs = sorted(msgs, key=lambda x: str(x.get("sent_at", "")))
    return {"messages": clean_docs(msgs)}


@router.post("/api/messages")
async def send_direct_message(payload: DirectMessageCreate, db=Depends(get_db)):
    messages_col = db["direct_messages"]
    new_id = (messages_col.count_documents({}) if hasattr(messages_col, "count_documents") else messages_col.count()) + 1
    msg_doc = {
        "id": new_id,
        "sender_id": payload.sender_id,
        "sender_name": payload.sender_name,
        "receiver_id": payload.receiver_id,
        "receiver_name": payload.receiver_name,
        "message": payload.message,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    messages_col.insert_one(msg_doc)
    return {"message": "Message sent successfully", "data": msg_doc}
