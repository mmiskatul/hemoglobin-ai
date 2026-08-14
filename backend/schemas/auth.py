from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    blood_group: str = Field(default="O+", max_length=10)
    location: str = Field(default="Dhaka", max_length=100)
    phone: str = Field(default="+8801700000000", max_length=30)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class VerifyOTPPayload(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)


class ResendOTPPayload(BaseModel):
    email: EmailStr


class ForgotPasswordPayload(BaseModel):
    email: EmailStr


class ResetPasswordPayload(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)
    new_password: str = Field(..., min_length=6, max_length=100)


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    blood_group: Optional[str] = None
    is_available: Optional[bool] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
