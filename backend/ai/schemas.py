from pydantic import BaseModel, Field


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
    request_id: str = Field(default="REQ-001", min_length=1, max_length=100)
    urgency: str = Field(default="CRITICAL", max_length=20)
    blood_type: str = Field(default="O+", max_length=10)
    location: str = Field(default="Dhaka", max_length=100)
    hospital_name: str = Field(default="General Hospital", max_length=150)
    units_needed: int = Field(default=1, ge=1, le=50)
    notes: str | None = None
