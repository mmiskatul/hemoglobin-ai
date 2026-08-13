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


class DonorCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=6, max_length=30)
    blood_group: str = Field(..., max_length=10)
    location: str = Field(..., min_length=2, max_length=100)
    is_available: bool = True


class PostCreate(BaseModel):
    author_name: str = Field(..., min_length=2, max_length=100)
    user_id: int = Field(default=1)
    blood_group: str = Field(..., max_length=10)
    location: str = Field(..., min_length=2, max_length=100)
    urgency: str = Field(default="CRITICAL", max_length=20)
    content: str = Field(..., min_length=10, max_length=3000)


class DirectMessageCreate(BaseModel):
    sender_id: int
    sender_name: str
    receiver_id: int
    receiver_name: str
    message: str = Field(..., min_length=1, max_length=2000)


class PledgeCreate(BaseModel):
    donor_id: int
    donor_name: str
    donor_email: EmailStr


class AgentChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    user_id: int | None = None
    dashboard: str = Field(default="general", max_length=80)
    conversation_id: str | None = None
    user_role: str = Field(default="unknown")
    history: list[dict] = Field(default_factory=list)
    public_context: list[dict] | None = None


class KnowledgeUpsertRequest(BaseModel):
    document: str = Field(min_length=10, max_length=10000)
    category: str = Field(default="blood-bank-policy", max_length=100)
    metadata: dict = Field(default_factory=dict)


class RequestMatchAgentRequest(BaseModel):
    request_id: str = Field(min_length=1, max_length=100)
    urgency: str = Field(default="CRITICAL", max_length=20)
    blood_type: str = Field(..., max_length=10)
    location: str = Field(..., max_length=100)
    hospital_name: str = Field(default="General Hospital", max_length=150)
    units_needed: int = Field(default=1, ge=1, le=50)
    notes: str | None = None
