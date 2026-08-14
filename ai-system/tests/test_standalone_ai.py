import pytest
from fastapi.testclient import TestClient
from main import app
from agent import parse_blood_request, is_blood_search_intent
from schemas import AgentChatRequest, KnowledgeUpsertRequest, RequestMatchAgentRequest

client = TestClient(app)


def test_ai_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["service"] == "blood-hub-ai-system"
    assert data["status"] == "ok"


def test_ai_parsing():
    bg, loc = parse_blood_request("Need urgent AB- blood in Dhaka")
    assert bg == "AB-"
    assert loc.lower() == "dhaka"

    assert is_blood_search_intent("Find blood donors", "AB-", "Dhaka") is True
    assert is_blood_search_intent("Hello", None, None) is False


def test_ai_chat_endpoint_with_history():
    resp = client.post("/ai/chat", json={"message": "Hello AI Coordinator", "user_id": 99})
    assert resp.status_code == 200
    data = resp.json()
    assert "reply" in data
    assert len(data["reply"]) > 0

    hist_resp1 = client.get("/ai/chat/history/99")
    assert hist_resp1.status_code == 200
    assert len(hist_resp1.json()["history"]) >= 1

    hist_resp2 = client.get("/api/ai/chat/history/99")
    assert hist_resp2.status_code == 200
    assert len(hist_resp2.json()["history"]) >= 1


def test_ai_public_chat_endpoint():
    resp1 = client.post("/ai/public-chat", json={"message": "Is blood available?"})
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert "reply" in data1
    assert "active_donors_found" in data1

    resp2 = client.post("/api/ai/public-chat", json={"message": "Is blood available?"})
    assert resp2.status_code == 200


def test_ai_match_request_endpoint():
    payload = {
        "request_id": "REQ-777",
        "urgency": "HIGH",
        "blood_type": "B+",
        "location": "Dhaka",
        "hospital_name": "Square Hospital",
        "units_needed": 1,
        "notes": "Surgery in 2 hours",
    }
    resp1 = client.post("/ai/match-request", json=payload)
    assert resp1.status_code == 200
    assert "match_count" in resp1.json()

    resp2 = client.post("/api/ai/match-request", json=payload)
    assert resp2.status_code == 200
