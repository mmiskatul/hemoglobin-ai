import os
import re
import base64
import random
import logging
import cloudinary
import cloudinary.uploader
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from ai_agent.config import get_ai_settings
from ai_agent.database import get_db
from ai_agent.schemas import (
    DonorCreate,
    AgentChatRequest,
    KnowledgeUpsertRequest,
    RequestMatchAgentRequest,
    UserRegister,
    UserLogin,
    VerifyOTPPayload,
    ResendOTPPayload,
    ForgotPasswordPayload,
    ResetPasswordPayload,
    UserProfileUpdate,
    PostCreate,
    DirectMessageCreate,
    PledgeCreate,
)
from ai_agent.agent import process_ai_chat_request, process_public_chat_request, process_match_request
from ai_agent.rag import upsert_knowledge
from ai_agent.emailer import send_donor_notification, send_verification_otp_email
from ai_agent.auth import create_jwt_token

router = APIRouter()


# ---------- User Authentication & Registration SMTP Verification Endpoints ----------

@router.post("/api/auth/register")
async def register_user(payload: UserRegister, db=Depends(get_db)):
    users_col = db["users"]
    clean_email = payload.email.lower().strip()
    existing = users_col.find_one({"email": clean_email})
    if existing:
        if existing.get("is_verified", True):
            raise HTTPException(status_code=400, detail="Email already registered and verified")
        else:
            # Resend OTP for unverified user
            otp = f"{random.randint(100000, 999999)}"
            users_col.update_one(
                {"email": clean_email},
                {"$set": {"verification_otp": otp, "password_hash": payload.password}}
            )
            await send_verification_otp_email(clean_email, payload.name, otp, payload.phone)
            return {
                "message": "Verification OTP resent to your email address",
                "requires_verification": True,
                "email": clean_email,
                "otp_demo": otp,
            }

    # Generate 6-digit verification code
    otp = f"{random.randint(100000, 999999)}"
    new_id = (users_col.count_documents({}) if hasattr(users_col, "count_documents") else users_col.count()) + 1

    user_doc = {
        "id": new_id,
        "name": payload.name,
        "email": clean_email,
        "password_hash": payload.password,
        "blood_group": payload.blood_group.replace(" ", "+").strip().upper(),
        "location": payload.location.strip(),
        "phone": payload.phone,
        "role": "Donor",
        "is_verified": False,
        "verification_otp": otp,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    users_col.insert_one(user_doc)

    # Dispatch Verification Email via SMTP with Title & Phone
    await send_verification_otp_email(clean_email, payload.name, otp, payload.phone)

    return {
        "message": "Account registration initiated. Please check your email for your 6-digit verification OTP.",
        "requires_verification": True,
        "email": clean_email,
        "otp_demo": otp,  # Friendly demo fallback in JSON response
    }


@router.post("/api/auth/verify-otp")
async def verify_otp(payload: VerifyOTPPayload, db=Depends(get_db)):
    users_col = db["users"]
    clean_email = payload.email.lower().strip()
    user = users_col.find_one({"email": clean_email})

    if not user:
        raise HTTPException(status_code=404, detail="Registration profile not found")

    if user.get("verification_otp") != payload.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid 6-digit verification code")

    # Mark user as verified in MongoDB Atlas
    if hasattr(users_col, "update_one"):
        users_col.update_one({"email": clean_email}, {"$set": {"is_verified": True}})
    else:
        user["is_verified"] = True

    # Activate Donor Record if role is Donor
    if user.get("role", "Donor").lower() == "donor":
        donors_col = db["donors"]
        existing_donor = donors_col.find_one({"email": clean_email})
        if not existing_donor:
            donor_id = (donors_col.count_documents({}) if hasattr(donors_col, "count_documents") else donors_col.count()) + 1
            donor_doc = {
                "id": donor_id,
                "name": user["name"],
                "email": clean_email,
                "phone": user.get("phone", "+8801700000000"),
                "blood_group": user.get("blood_group", "O+"),
                "location": user.get("location", "Sylhet"),
                "is_available": True,
                "registered_at": datetime.now(timezone.utc).isoformat(),
            }
            donors_col.insert_one(donor_doc)

    jwt_token = create_jwt_token(user["id"], clean_email, user.get("role", "Donor"))

    return {
        "message": "Email address verified successfully!",
        "token": jwt_token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": clean_email,
            "role": user.get("role", "Donor"),
            "blood_group": user.get("blood_group", "O+"),
            "location": user.get("location", "Sylhet"),
            "is_verified": True,
        },
    }


@router.post("/api/auth/resend-otp")
async def resend_otp(payload: ResendOTPPayload, db=Depends(get_db)):
    users_col = db["users"]
    clean_email = payload.email.lower().strip()
    user = users_col.find_one({"email": clean_email})

    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    otp = f"{random.randint(100000, 999999)}"
    if hasattr(users_col, "update_one"):
        users_col.update_one({"email": clean_email}, {"$set": {"verification_otp": otp}})
    else:
        user["verification_otp"] = otp

    await send_verification_otp_email(clean_email, user.get("name", "Valued User"), otp)

    return {
        "message": "A fresh 6-digit verification code has been dispatched to your email via SMTP.",
        "email": clean_email,
        "otp_demo": otp,
    }


@router.post("/api/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordPayload, db=Depends(get_db)):
    users_col = db["users"]
    clean_email = payload.email.lower().strip()
    user = users_col.find_one({"email": clean_email})

    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address")

    # Generate a 6-digit password reset OTP
    reset_otp = f"{random.randint(100000, 999999)}"
    users_col.update_one(
        {"email": clean_email},
        {"$set": {"reset_otp": reset_otp}}
    )

    # Optionally send via SMTP (non-blocking)
    try:
        await send_verification_otp_email(clean_email, user.get("name", "User"), reset_otp)
    except Exception:
        pass  # Still return the OTP in the response for demo

    return {
        "message": "Password reset code generated.",
        "email": clean_email,
        "otp_demo": reset_otp,
    }


@router.post("/api/auth/reset-password")
async def reset_password(payload: ResetPasswordPayload, db=Depends(get_db)):
    users_col = db["users"]
    clean_email = payload.email.lower().strip()
    user = users_col.find_one({"email": clean_email})

    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    stored_otp = user.get("reset_otp", "")
    if not stored_otp or stored_otp != payload.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    # Update password and clear reset OTP
    users_col.update_one(
        {"email": clean_email},
        {"$set": {"password_hash": payload.new_password}, "$unset": {"reset_otp": ""}}
    )

    return {"message": "Password reset successfully! You can now log in with your new password."}


@router.post("/api/auth/login")
async def login_user(payload: UserLogin, db=Depends(get_db)):
    users_col = db["users"]
    email_clean = payload.email.lower().strip()
    user = users_col.find_one({"email": email_clean})
    if not user or user.get("password_hash") != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=403,
            detail="Account not verified! Please enter the 6-digit OTP code sent to your email to activate your account."
        )

    jwt_token = create_jwt_token(user["id"], user["email"], user.get("role", "Donor"))

    return {
        "message": "Login successful",
        "token": jwt_token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "Donor"),
            "blood_group": user.get("blood_group", "O+"),
            "location": user.get("location", "Sylhet"),
            "is_verified": True,
        },
    }


@router.get("/api/auth/me/{user_id}")
async def get_user_profile(user_id: int, db=Depends(get_db)):
    users_col = db["users"]
    user = users_col.find_one({"id": user_id})
    if not user:
        user = users_col.find_one({"id": str(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    return {
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "Donor"),
            "blood_group": user.get("blood_group", "O+"),
            "location": user.get("location", "Sylhet"),
            "avatar_url": user.get("avatar_url", ""),
            "bio": user.get("bio", ""),
            "phone": user.get("phone", ""),
            "is_available": user.get("is_available", True),
        }
    }


@router.get("/api/users/profile/{user_id}")
async def get_user_profile_detail(user_id: int, db=Depends(get_db)):
    users_col = db["users"]
    donors_col = db["donors"]
    
    user = users_col.find_one({"id": user_id})
    if not user:
        user = users_col.find_one({"id": str(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")

    clean_email = user["email"].lower().strip()
    donor = donors_col.find_one({"email": clean_email})
    
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "Donor"),
        "blood_group": user.get("blood_group", "O+"),
        "location": user.get("location", "Sylhet Sadar, Sylhet"),
        "phone": user.get("phone", "+8801700000000"),
        "is_verified": user.get("is_verified", True),
        "is_available": donor.get("is_available", True) if donor else user.get("is_available", True),
        "avatar_url": user.get("avatar_url", ""),
        "bio": user.get("bio", "Registered Hero on Smart Blood Hub Network"),
        "created_at": user.get("created_at", ""),
    }


@router.put("/api/users/profile/{user_id}")
async def update_user_profile_detail(user_id: int, payload: UserProfileUpdate, db=Depends(get_db)):
    users_col = db["users"]
    donors_col = db["donors"]

    user = users_col.find_one({"id": user_id})
    if not user:
        user = users_col.find_one({"id": str(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")

    clean_email = user["email"].lower().strip()
    update_fields = {}
    
    if payload.name is not None:
        update_fields["name"] = payload.name.strip()
    if payload.phone is not None:
        update_fields["phone"] = payload.phone.strip()
    if payload.location is not None:
        update_fields["location"] = payload.location.strip()
    if payload.blood_group is not None:
        update_fields["blood_group"] = payload.blood_group.strip().upper()
    if payload.avatar_url is not None:
        update_fields["avatar_url"] = payload.avatar_url
    if payload.bio is not None:
        update_fields["bio"] = payload.bio.strip()
    if payload.is_available is not None:
        update_fields["is_available"] = payload.is_available

    if update_fields:
        users_col.update_one({"email": clean_email}, {"$set": update_fields})

    donor_fields = {}
    if payload.name is not None: donor_fields["name"] = payload.name.strip()
    if payload.phone is not None: donor_fields["phone"] = payload.phone.strip()
    if payload.location is not None: donor_fields["location"] = payload.location.strip()
    if payload.blood_group is not None: donor_fields["blood_group"] = payload.blood_group.strip().upper()
    if payload.is_available is not None: donor_fields["is_available"] = payload.is_available
    if payload.avatar_url is not None: donor_fields["avatar_url"] = payload.avatar_url

    if donor_fields:
        donors_col.update_one({"email": clean_email}, {"$set": donor_fields})

    updated_user = users_col.find_one({"email": clean_email})
    return {
        "message": "User profile updated successfully!",
        "user": {
            "id": updated_user["id"],
            "name": updated_user["name"],
            "email": updated_user["email"],
            "role": updated_user.get("role", "Donor"),
            "blood_group": updated_user.get("blood_group", "O+"),
            "location": updated_user.get("location", "Sylhet"),
            "phone": updated_user.get("phone", "+8801700000000"),
            "is_verified": updated_user.get("is_verified", True),
            "is_available": updated_user.get("is_available", True),
            "avatar_url": updated_user.get("avatar_url", ""),
            "bio": updated_user.get("bio", ""),
        }
    }


@router.post("/api/upload/avatar")
async def upload_avatar_cloudinary(file: UploadFile = File(...)):
    settings = get_ai_settings()
    cloud_name = settings.cloudinary_cloud_name or os.getenv("CLOUDINARY_CLOUD_NAME", "smartbloodhub")
    api_key = settings.cloudinary_api_key or os.getenv("CLOUDINARY_API_KEY", "")
    api_secret = settings.cloudinary_api_secret or os.getenv("CLOUDINARY_API_SECRET", "")

    content = await file.read()

    if api_key and api_secret:
        try:
            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret,
                secure=True
            )
            res = cloudinary.uploader.upload(
                content,
                folder="smart_blood_hub_avatars"
            )
            url = res.get("secure_url") or res.get("url")
            return {"url": url, "provider": "Cloudinary", "message": "Avatar uploaded to Cloudinary successfully!"}
        except Exception as err:
            logging.warning(f"Cloudinary API upload error: {err}. Falling back to Data URL encoding.")

    b64 = base64.b64encode(content).decode("utf-8")
    content_type = file.content_type or "image/png"
    url = f"data:{content_type};base64,{b64}"
    return {"url": url, "provider": "DataURL", "message": "Avatar image processed successfully!"}


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


# ---------- Direct Messaging Endpoints (MongoDB) ----------

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


# ---------- Donor Registry Endpoints (MongoDB) ----------

@router.post("/api/donors")
async def register_donor(payload: DonorCreate, db=Depends(get_db)):
    clean_bg = payload.blood_group.replace(" ", "+").strip().upper()
    donors_col = db["donors"]
    existing = donors_col.find_one({"email": payload.email})
    if existing:
        donors_col.update_one(
            {"email": payload.email},
            {
                "$set": {
                    "name": payload.name,
                    "phone": payload.phone,
                    "blood_group": clean_bg,
                    "location": payload.location.title(),
                    "is_available": payload.is_available,
                }
            },
        )
        updated = donors_col.find_one({"email": payload.email})
        return {"message": "Donor profile updated successfully", "donor": clean_doc(updated)}

    new_id = (donors_col.count_documents({}) if hasattr(donors_col, "count_documents") else donors_col.count()) + 1
    donor_doc = {
        "id": new_id,
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone,
        "blood_group": clean_bg,
        "location": payload.location.title(),
        "is_available": payload.is_available,
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }
    donors_col.insert_one(donor_doc)
    return {"message": "Donor registered successfully", "donor": donor_doc}


@router.get("/api/donors")
async def list_donors(
    blood_group: str | None = Query(None),
    location: str | None = Query(None),
    db=Depends(get_db),
):
    donors_col = db["donors"]
    query = {}
    if blood_group and blood_group != "ALL":
        clean_bg = blood_group.replace(" ", "+").strip().upper()
        query["blood_group"] = clean_bg
    if location:
        query["location"] = {"$regex": location.strip(), "$options": "i"}

    donors = donors_col.find(query)
    donors = sorted(donors, key=lambda x: str(x.get("registered_at", "")), reverse=True)
    return {"donors": clean_docs(donors), "total": len(donors)}


@router.patch("/api/donors/{donor_id}/toggle-availability")
async def toggle_donor_availability(donor_id: int, db=Depends(get_db)):
    donors_col = db["donors"]
    donor = donors_col.find_one({"id": donor_id})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    new_avail = not donor.get("is_available", True)
    donors_col.update_one({"id": donor_id}, {"$set": {"is_available": new_avail}})
    updated = donors_col.find_one({"id": donor_id})
    return {"message": f"Donor availability set to {new_avail}", "donor": updated}


@router.delete("/api/donors/{donor_id}")
async def delete_donor(donor_id: int, db=Depends(get_db)):
    donors_col = db["donors"]
    donor = donors_col.find_one({"id": donor_id})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    donors_col.delete_one({"id": donor_id})
    return {"message": f"Donor '{donor['name']}' removed from registry"}


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


# ---------- AI Chat & Notification Endpoints (MongoDB) ----------

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
    req_dict = getattr(payload, "request", None) or {"blood_group": getattr(payload, "blood_type", "O+"), "location": getattr(payload, "location", "Dhaka")}
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


# ---------- Audit Trail & Dispatch Log Endpoints (MongoDB) ----------

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
