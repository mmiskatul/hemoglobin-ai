from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AgentChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    user_id: Optional[int] = None
    dashboard: str = Field(default="general", max_length=80)
    conversation_id: Optional[str] = None
    user_role: str = Field(default="unknown")
    history: List[Dict[str, Any]] = Field(default_factory=list)
    public_context: Optional[List[Dict[str, Any]]] = None


class KnowledgeUpsertRequest(BaseModel):
    document: str = Field(min_length=10, max_length=10000)
    category: str = Field(default="blood-bank-policy", max_length=100)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RequestMatchAgentRequest(BaseModel):
    request_id: str = Field(default="REQ-001", min_length=1, max_length=100)
    urgency: str = Field(default="CRITICAL", max_length=20)
    blood_type: str = Field(default="O+", max_length=10)
    location: str = Field(default="Dhaka", max_length=100)
    hospital_name: str = Field(default="General Hospital", max_length=150)
    units_needed: int = Field(default=1, ge=1, le=50)
    notes: Optional[str] = None
    donors: Optional[List[Dict[str, Any]]] = None


class AIResponse(BaseModel):
    reply: str
    matching_count: int = 0
    notifications_sent: int = 0
    donors: List[Dict[str, Any]] = Field(default_factory=list)
    rag_context_used: bool = False
