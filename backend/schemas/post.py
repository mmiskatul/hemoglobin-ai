from pydantic import BaseModel, EmailStr, Field


class PostCreate(BaseModel):
    author_name: str = Field(..., min_length=2, max_length=100)
    user_id: int = Field(default=1)
    blood_group: str = Field(..., max_length=10)
    location: str = Field(..., min_length=2, max_length=100)
    urgency: str = Field(default="CRITICAL", max_length=20)
    content: str = Field(..., min_length=10, max_length=3000)


class PledgeCreate(BaseModel):
    donor_id: int
    donor_name: str
    donor_email: EmailStr
