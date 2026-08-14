from pydantic import BaseModel, Field


class DirectMessageCreate(BaseModel):
    sender_id: int
    sender_name: str
    receiver_id: int
    receiver_name: str
    message: str = Field(..., min_length=1, max_length=2000)
