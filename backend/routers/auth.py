import os
import random
import base64
import logging
import cloudinary
import cloudinary.uploader
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from core.config import get_ai_settings
from core.database import get_db
from core.auth import create_jwt_token
from core.emailer import send_verification_otp_email
from schemas.auth import (
    UserRegister,
    UserLogin,
    VerifyOTPPayload,
    ResendOTPPayload,
    ForgotPasswordPayload,
    ResetPasswordPayload,
    UserProfileUpdate,
)

router = APIRouter(tags=["Authentication & Users"])


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
        "otp_demo": otp,
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

    reset_otp = f"{random.randint(100000, 999999)}"
    users_col.update_one(
        {"email": clean_email},
        {"$set": {"reset_otp": reset_otp}}
    )

    try:
        await send_verification_otp_email(clean_email, user.get("name", "User"), reset_otp)
    except Exception:
        pass

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
