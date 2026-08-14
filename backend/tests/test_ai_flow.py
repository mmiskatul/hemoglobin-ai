import pytest
from fastapi.testclient import TestClient
from main import app
from ai import (
    process_ai_chat_request,
    process_public_chat_request,
    process_match_request,
    parse_blood_request,
    is_blood_search_intent,
    retrieve_context,
    upsert_knowledge,
)
from ai.schemas import (
    AgentChatRequest,
    KnowledgeUpsertRequest,
    RequestMatchAgentRequest,
)
from core.database import get_db

client = TestClient(app)


def test_ai_parsing_utilities():
    bg, loc = parse_blood_request("Need urgent O+ blood in Sylhet")
    assert bg == "O+"
    assert loc.lower() == "sylhet"

    assert is_blood_search_intent("Find blood donors", "O+", "Sylhet") is True
    assert is_blood_search_intent("Hello how are you", None, None) is False


def test_ai_chat_endpoint():
    resp = client.post("/api/ai/chat", json={"message": "Hello AI Coordinator"})
    assert resp.status_code == 200
    data = resp.json()
    assert "reply" in data
    assert len(data["reply"]) > 0
    assert "matching_count" in data


def test_ai_public_chat_endpoint():
    resp = client.post("/api/ai/public-chat", json={"message": "Is there O+ blood in Sylhet?"})
    assert resp.status_code == 200
    data = resp.json()
    assert "reply" in data
    assert "active_donors_found" in data


def test_ai_match_request_endpoint():
    payload = {
        "request_id": "REQ-101",
        "urgency": "CRITICAL",
        "blood_type": "O+",
        "location": "Sylhet",
        "hospital_name": "Sylhet Medical",
        "units_needed": 2,
        "notes": "Emergency surgery match",
    }
    resp = client.post("/api/ai/match-request", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "match_count" in data


def test_ai_schemas_validation():
    chat_req = AgentChatRequest(message="Test query", user_id=1)
    assert chat_req.message == "Test query"
    assert chat_req.user_id == 1

    know_req = KnowledgeUpsertRequest(document="Standard blood policy document minimum length check.")
    assert "blood" in know_req.document

    match_req = RequestMatchAgentRequest(blood_type="A+", location="Dhaka")
    assert match_req.blood_type == "A+"
