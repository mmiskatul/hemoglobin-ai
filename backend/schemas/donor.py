from pydantic import BaseModel, EmailStr, Field


class DonorCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=6, max_length=30)
    blood_group: str = Field(..., max_length=10)
    location: str = Field(..., min_length=2, max_length=100)
    is_available: bool = True
