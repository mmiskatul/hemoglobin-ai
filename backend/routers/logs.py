from fastapi import APIRouter, Depends, HTTPException, Query
from core.database import get_db
from core.emailer import send_donor_notification

router = APIRouter(tags=["Audit Logs & System Stats"])


def clean_doc(doc: dict | None) -> dict | None:
    if not doc:
        return doc
    clean = dict(doc)
    if "_id" in clean:
        clean["_id"] = str(clean["_id"])
    return clean


def clean_docs(docs) -> list:
    return [clean_doc(d) for d in docs]


@router.get("/api/stats/overview")
async def get_overview_stats(db=Depends(get_db)):
    donors_col = db["donors"]
    logs_col = db["notification_logs"]

    total_donors = donors_col.count_documents({}) if hasattr(donors_col, "count_documents") else donors_col.count()
    available_donors = len(list(donors_col.find({"is_available": True})))

    all_logs = list(logs_col.find({}))
    total_logs = len(all_logs)
    delivered = len([l for l in all_logs if l.get("status") == "DELIVERED"])
    simulated = len([l for l in all_logs if l.get("status") in ["SIMULATED_SENT", "SENT_LOGGED", "SENT"]])

    bg_counts = {}
    for l in all_logs:
        bg = l.get("blood_group", "O+")
        bg_counts[bg] = bg_counts.get(bg, 0) + 1
    top_blood_group = max(bg_counts, key=bg_counts.get) if bg_counts else "O+"

    success_rate = round(((delivered + simulated) / total_logs * 100), 1) if total_logs > 0 else 100.0
    last_log = max(all_logs, key=lambda x: str(x.get("sent_at", ""))) if all_logs else None
    last_activity = last_log.get("sent_at") if last_log else None

    return {
        "total_donors": total_donors,
        "available_donors": available_donors,
        "total_dispatched": total_logs,
        "success_rate": success_rate,
        "top_blood_group": top_blood_group,
        "last_activity": last_activity,
    }


@router.get("/api/logs")
async def view_notification_logs(
    search: str | None = Query(None),
    blood_group: str | None = Query(None),
    status: str | None = Query(None),
    location: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db=Depends(get_db),
):
    logs_col = db["notification_logs"]
    query = {}
    if blood_group and blood_group != "ALL":
        query["blood_group"] = blood_group.replace(" ", "+").strip().upper()
    if status and status != "ALL":
        query["status"] = {"$regex": status.strip(), "$options": "i"}
    if location:
        query["location"] = {"$regex": location.strip(), "$options": "i"}
    if search:
        s = search.strip()
        query["$or"] = [
            {"donor_name": {"$regex": s, "$options": "i"}},
            {"donor_email": {"$regex": s, "$options": "i"}},
            {"location": {"$regex": s, "$options": "i"}},
            {"message_content": {"$regex": s, "$options": "i"}},
        ]

    logs = list(logs_col.find(query))
    logs = sorted(logs, key=lambda x: str(x.get("sent_at", "")), reverse=True)[:limit]
    return {"logs": clean_docs(logs), "total": len(logs)}


@router.get("/api/logs/stats")
async def get_log_stats(db=Depends(get_db)):
    logs_col = db["notification_logs"]
    all_logs = list(logs_col.find({}))
    total = len(all_logs)
    delivered = len([l for l in all_logs if l.get("status") == "DELIVERED"])
    simulated = len([l for l in all_logs if l.get("status") in ["SIMULATED_SENT", "SENT_LOGGED", "SENT"]])
    failed = len([l for l in all_logs if l.get("status") == "FAILED"])

    bg_counts = {}
    for l in all_logs:
        bg = l.get("blood_group", "O+")
        bg_counts[bg] = bg_counts.get(bg, 0) + 1
    top_blood_group = max(bg_counts, key=bg_counts.get) if bg_counts else "O+"
    success_rate = round(((delivered + simulated) / total * 100), 1) if total > 0 else 100.0

    return {
        "total_dispatched": total,
        "delivered_count": delivered,
        "simulated_count": simulated,
        "failed_count": failed,
        "success_rate": success_rate,
        "top_blood_group": top_blood_group,
    }


@router.get("/api/logs/{log_id}")
async def get_single_log(log_id: int, db=Depends(get_db)):
    logs_col = db["notification_logs"]
    log = logs_col.find_one({"id": log_id})
    if not log:
        raise HTTPException(status_code=404, detail="Notification audit log not found")
    return {"log": clean_doc(log)}


@router.post("/api/logs/resend/{log_id}")
async def resend_notification(log_id: int, db=Depends(get_db)):
    logs_col = db["notification_logs"]
    log = logs_col.find_one({"id": log_id})
    if not log:
        raise HTTPException(status_code=404, detail="Audit log entry not found")

    donor_dict = {
        "name": log["donor_name"],
        "email": log["donor_email"],
        "blood_group": log["blood_group"],
        "location": log["location"],
    }

    resend_result = await send_donor_notification(
        donor=donor_dict,
        blood_group=log["blood_group"],
        location=log["location"],
        requester_message=f"[RE-DISPATCH AUDIT ALERT] {log.get('message_content', '')[:150]}...",
        db=db,
    )
    return {"message": f"Alert re-dispatched to {log['donor_email']}", "result": resend_result}


@router.delete("/api/logs/{log_id}")
async def delete_log(log_id: int, db=Depends(get_db)):
    logs_col = db["notification_logs"]
    log = logs_col.find_one({"id": log_id})
    if not log:
        raise HTTPException(status_code=404, detail="Audit log entry not found")
    logs_col.delete_one({"id": log_id})
    return {"message": f"Audit log #{log_id} deleted successfully"}


@router.post("/api/logs/clear")
async def clear_all_logs(db=Depends(get_db)):
    logs_col = db["notification_logs"]
    count = logs_col.delete_many({})
    return {"message": f"All audit logs cleared ({count} deleted)"}


@router.post("/api/logs/test-trigger")
async def trigger_test_audit_log(db=Depends(get_db)):
    test_donor = {
        "name": "Dr. Sarah Khan (Demo)",
        "email": "sarah.khan@smartbloodhub.org",
        "blood_group": "O-",
        "location": "Dhaka Central",
    }
    log = await send_donor_notification(
        donor=test_donor,
        blood_group="O-",
        location="Dhaka Central",
        requester_message="URGENT AUDIT SYSTEM TEST: Verified simulated emergency alert dispatch",
        db=db,
    )
    return {"message": "Test audit log successfully generated", "log": log}
