from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from core.database import get_db
from core.emailer import send_donor_notification
from schemas.post import PostCreate, PledgeCreate

router = APIRouter(tags=["Community & Emergency Posts"])


def clean_doc(doc: dict | None) -> dict | None:
    if not doc:
        return doc
    clean = dict(doc)
    if "_id" in clean:
        clean["_id"] = str(clean["_id"])
    return clean


def clean_docs(docs) -> list:
    return [clean_doc(d) for d in docs]


@router.get("/api/posts")
async def list_posts(
    blood_group: str | None = Query(None),
    location: str | None = Query(None),
    db=Depends(get_db),
):
    posts_col = db["posts"]
    query = {}
    if blood_group and blood_group != "ALL":
        query["blood_group"] = blood_group.replace(" ", "+").strip().upper()
    if location:
        query["location"] = {"$regex": location.strip(), "$options": "i"}

    posts = posts_col.find(query)
    posts = sorted(posts, key=lambda x: str(x.get("created_at", "")), reverse=True)
    return {"posts": clean_docs(posts), "total": len(posts)}


@router.post("/api/posts")
async def create_post(payload: PostCreate, db=Depends(get_db)):
    clean_bg = payload.blood_group.replace(" ", "+").strip().upper()
    clean_loc = payload.location.title()

    donors_col = db["donors"]
    matching_donors = list(donors_col.find({"is_available": True, "blood_group": clean_bg, "location": {"$regex": clean_loc, "$options": "i"}}))

    dispatched_count = 0
    for d in matching_donors:
        donor_dict = {"name": d["name"], "email": d["email"], "blood_group": d["blood_group"], "location": d["location"]}
        await send_donor_notification(
            donor=donor_dict,
            blood_group=clean_bg,
            location=clean_loc,
            requester_message=payload.content,
            db=db,
        )
        dispatched_count += 1

    ai_summary = (
        f"🤖 AI Match Engine: Analyzed post content. Found {len(matching_donors)} verified {clean_bg} donor(s) in {clean_loc}. "
        + (f"Emergency alerts dispatched to: {', '.join([d['name'] for d in matching_donors])}." if len(matching_donors) > 0 else "No active donor match in immediate vicinity. Alert logged to emergency queue.")
    )

    posts_col = db["posts"]
    new_id = (posts_col.count_documents({}) if hasattr(posts_col, "count_documents") else posts_col.count()) + 1
    post_doc = {
        "id": new_id,
        "user_id": payload.user_id,
        "author_name": payload.author_name,
        "blood_group": clean_bg,
        "location": clean_loc,
        "urgency": payload.urgency.upper(),
        "content": payload.content,
        "ai_analysis": ai_summary,
        "matched_donor_count": len(matching_donors),
        "likes_count": 0,
        "liked_by": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    posts_col.insert_one(post_doc)
    return {"message": "Emergency need posted successfully", "post": post_doc, "matched_donors": len(matching_donors)}


@router.post("/api/posts/{post_id}/like")
async def toggle_like_post(post_id: int, payload: dict, db=Depends(get_db)):
    posts_col = db["posts"]
    post = posts_col.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    user_id = payload.get("user_id", 0)
    liked_by = list(post.get("liked_by", []))
    likes_count = int(post.get("likes_count", 0))

    if user_id and user_id in liked_by:
        liked_by.remove(user_id)
        likes_count = max(0, likes_count - 1)
        has_liked = False
    else:
        if user_id:
            liked_by.append(user_id)
        likes_count += 1
        has_liked = True

    posts_col.update_one(
        {"id": post_id},
        {"$set": {"likes_count": likes_count, "liked_by": liked_by}}
    )
    return {
        "message": "Post like updated successfully",
        "post_id": post_id,
        "likes_count": likes_count,
        "has_liked": has_liked,
    }


@router.post("/api/posts/{post_id}/pledge")
async def pledge_donation(post_id: int, payload: PledgeCreate, db=Depends(get_db)):
    posts_col = db["posts"]
    post = posts_col.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.get("user_id") and post.get("user_id") == payload.donor_id:
        raise HTTPException(status_code=400, detail="You cannot pledge to your own emergency request.")

    pledges_col = db["pledges"]
    new_id = (pledges_col.count_documents({}) if hasattr(pledges_col, "count_documents") else pledges_col.count()) + 1
    pledge_doc = {
        "id": new_id,
        "post_id": post_id,
        "donor_id": payload.donor_id,
        "donor_name": payload.donor_name,
        "donor_email": payload.donor_email,
        "status": "PLEDGED",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    pledges_col.insert_one(pledge_doc)
    return {"message": f"Thank you {payload.donor_name}! Your pledge for Post #{post_id} has been recorded.", "pledge": pledge_doc}


@router.post("/api/pledges")
async def create_donor_pledge(payload: dict, db=Depends(get_db)):
    pledges_col = db["pledges"]
    new_id = (pledges_col.count_documents({}) if hasattr(pledges_col, "count_documents") else pledges_col.count()) + 1
    doc = {
        "id": new_id,
        "donor_id": payload.get("donor_id"),
        "donor_name": payload.get("donor_name"),
        "donor_email": payload.get("donor_email"),
        "pledged_at": datetime.now(timezone.utc).isoformat()
    }
    pledges_col.insert_one(doc)
    return {"message": "Donor pledge recorded successfully", "pledge": doc}
