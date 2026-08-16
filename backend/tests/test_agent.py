import pytest
from fastapi.testclient import TestClient
from main import app
from core.database import get_db

client = TestClient(app)


# Mock / In-Memory Singleton MongoDB Database for Isolated Testing
class MockCollection:

    def __init__(self):
        self.data = []

    def insert_one(self, doc):
        d = dict(doc)
        if "id" not in d:
            d["id"] = len(self.data) + 1
        self.data.append(d)
        return type("InsertOneResult", (), {"inserted_id": d["id"]})()

    def find(self, filter_dict=None):
        filter_dict = filter_dict or {}
        results = []
        for d in self.data:
            match = True
            for k, v in filter_dict.items():
                if k == "$or" and isinstance(v, list):
                    or_match = False
                    for cond in v:
                        sub_match = True
                        for sub_k, sub_v in cond.items():
                            val = d.get(sub_k)
                            if isinstance(sub_v, dict) and "$regex" in sub_v:
                                pat = sub_v["$regex"].lower()
                                if not val or pat not in str(val).lower():
                                    sub_match = False
                                    break
                            elif val != sub_v:
                                sub_match = False
                                break
                        if sub_match:
                            or_match = True
                            break
                    if not or_match:
                        match = False
                        break
                else:
                    val = d.get(k)
                    if k == "id":
                        if str(val) != str(v):
                            match = False
                            break
                    elif isinstance(v, dict) and "$regex" in v:
                        pattern = v["$regex"].lower()
                        if not val or pattern not in str(val).lower():
                            match = False
                            break
                    elif val != v:
                        match = False
                        break
            if match:
                results.append(d)
        return results

    def find_one(self, filter_dict):
        results = self.find(filter_dict)
        return results[0] if results else None

    def update_one(self, filter_dict, update_dict):
        doc = self.find_one(filter_dict)
        if doc and "$set" in update_dict:
            doc.update(update_dict["$set"])

    def delete_one(self, filter_dict):
        doc = self.find_one(filter_dict)
        if doc and doc in self.data:
            self.data.remove(doc)
            return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()

    def delete_many(self, filter_dict=None):
        count = len(self.data)
        self.data.clear()
        return type("DeleteResult", (), {"deleted_count": count})()

    def count_documents(self, filter_dict=None):
        return len(self.find(filter_dict))

    def count(self, filter_dict=None):
        return len(self.find(filter_dict))


class MockDB:

    def __init__(self):
        self.collections = {}

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = MockCollection()
        return self.collections[name]


global_mock_db = MockDB()


def override_get_db():
    return global_mock_db


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_mock_db():
    global global_mock_db
    global_mock_db.collections = {}


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-agent-backend"


def test_donor_registration_and_listing():
    # Register a real donor with user's real email masabimiskat@gmail.com
    payload = {
        "name": "Masab Miskat",
        "email": "masabimiskat@gmail.com",
        "phone": "+8801700000000",
        "blood_group": "B+",
        "location": "Chittagong",
        "is_available": True,
    }
    response = client.post("/api/donors", json=payload)
    assert response.status_code == 200
    assert response.json()["donor"]["name"] == "Masab Miskat"

    # Fetch donors with blood group filter
    response_list = client.get("/api/donors?blood_group=B+")
    assert response_list.status_code == 200
    data = response_list.json()
    assert data["total"] >= 1
    emails = [d["email"] for d in data["donors"]]
    assert "masabimiskat@gmail.com" in emails


def test_ai_chat_and_notification_log():
    # Pre-register donor with real user email masabimiskat@gmail.com
    donor_payload = {
        "name": "Masab Miskat",
        "email": "masabimiskat@gmail.com",
        "phone": "+8801700000000",
        "blood_group": "AB+",
        "location": "Khulna",
        "is_available": True,
    }
    client.post("/api/donors", json=donor_payload)

    # Send chat request matching Masab Miskat
    chat_payload = {"message": "Need urgent AB+ blood in Khulna"}
    chat_resp = client.post("/api/ai/chat", json=chat_payload)
    assert chat_resp.status_code == 200
    res_data = chat_resp.json()
    assert res_data["matching_count"] >= 1
    assert res_data["notifications_sent"] >= 1
    names = [d["name"] for d in res_data["donors"]]
    assert "Masab Miskat" in names

    # Verify notification log saved in DB
    logs_resp = client.get("/api/logs")
    assert logs_resp.status_code == 200
    logs_data = logs_resp.json()["logs"]
    assert len(logs_data) >= 1
    assert logs_data[0]["donor_email"] == "masabimiskat@gmail.com"
    assert logs_data[0]["blood_group"] == "AB+"


def test_ai_public_chat():
    chat_payload = {"message": "Are there any O- donors available?"}
    resp = client.post("/api/ai/public-chat", json=chat_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "reply" in data
    assert "active_donors_found" in data


def test_ai_match_request():
    payload = {
        "request_id": "REQ-101",
        "blood_type": "O+",
        "location": "Dhaka",
        "units_needed": 2,
        "notes": "Urgent match check",
    }
    resp = client.post("/api/ai/match-request", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "reply" in data


def test_ai_knowledge_unconfigured_error():
    payload = {
        "document": (
            "Universal donors have blood type O negative which can be given to"
            " anyone."
        ),
        "category": "Medical Protocol",
    }
    resp = client.post("/api/ai/knowledge", json=payload)
    assert resp.status_code in [200, 400]


def test_audit_log_filters_stats_resend_and_clear():
    # 1. Trigger test audit log
    trig_resp = client.post("/api/logs/test-trigger")
    assert trig_resp.status_code == 200
    assert "successfully generated" in trig_resp.json()["message"]

    # 2. Query logs with search filter
    search_resp = client.get("/api/logs?search=Sarah")
    assert search_resp.status_code == 200
    search_logs = search_resp.json()["logs"]
    assert len(search_logs) >= 1

    # 3. Query audit stats
    stats_resp = client.get("/api/logs/stats")
    assert stats_resp.status_code == 200
    stats_data = stats_resp.json()
    assert "total_dispatched" in stats_data
    assert stats_data["total_dispatched"] >= 1
    assert "success_rate" in stats_data

    # 4. Get single log detail & resend
    log_id = search_logs[0]["id"]
    single_resp = client.get(f"/api/logs/{log_id}")
    assert single_resp.status_code == 200
    assert single_resp.json()["log"]["id"] == log_id

    resend_resp = client.post(f"/api/logs/resend/{log_id}")
    assert resend_resp.status_code == 200
    assert "re-dispatched" in resend_resp.json()["message"]

    # 5. Delete single log & Clear all logs
    del_resp = client.delete(f"/api/logs/{log_id}")
    assert del_resp.status_code == 200

    clear_resp = client.post("/api/logs/clear")
    assert clear_resp.status_code == 200
    assert client.get("/api/logs").json()["total"] == 0


def test_donor_toggle_delete_and_overview_stats():
    # Register donor with real email masabimiskat@gmail.com
    payload = {
        "name": "Masab Miskat",
        "email": "masabimiskat@gmail.com",
        "phone": "+8801700000000",
        "blood_group": "O-",
        "location": "Sylhet",
        "is_available": True,
    }
    reg_resp = client.post("/api/donors", json=payload)
    assert reg_resp.status_code == 200
    donor_id = reg_resp.json()["donor"]["id"]

    # Toggle availability
    toggle_resp = client.patch(f"/api/donors/{donor_id}/toggle-availability")
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["donor"]["is_available"] == False

    # Overview stats
    overview_resp = client.get("/api/stats/overview")
    assert overview_resp.status_code == 200
    ov_data = overview_resp.json()
    assert "total_donors" in ov_data
    assert "available_donors" in ov_data

    # Delete donor
    del_resp = client.delete(f"/api/donors/{donor_id}")
    assert del_resp.status_code == 200
    assert "removed" in del_resp.json()["message"]


def test_social_network_auth_posts_and_messaging():
    # 1. User Register & Login with real user email masabimiskat@gmail.com
    reg_payload = {
        "name": "Masab Miskat",
        "email": "masabimiskat@gmail.com",
        "password": "securepassword",
        "blood_group": "O+",
        "location": "Sylhet",
        "phone": "+8801700000000",
        "role": "Donor",
    }
    reg_resp = client.post("/api/auth/register", json=reg_payload)
    assert reg_resp.status_code == 200
    otp = reg_resp.json()["otp_demo"]

    verify_resp = client.post(
        "/api/auth/verify-otp",
        json={"email": "masabimiskat@gmail.com", "otp": otp},
    )
    assert verify_resp.status_code == 200
    user_id = verify_resp.json()["user"]["id"]

    login_resp = client.post(
        "/api/auth/login",
        json={"email": "masabimiskat@gmail.com", "password": "securepassword"},
    )
    assert login_resp.status_code == 200
    assert "token" in login_resp.json()

    # 2. Create Emergency Need Post with AI Analysis
    post_payload = {
        "user_id": user_id,
        "author_name": "Masab Miskat",
        "blood_group": "O+",
        "location": "Sylhet",
        "urgency": "CRITICAL",
        "content": (
            "Emergency! Need 2 bags of O+ blood for patient in Sylhet hospital."
        ),
    }
    post_resp = client.post("/api/posts", json=post_payload)
    assert post_resp.status_code == 200
    post_data = post_resp.json()["post"]
    assert "AI Match Engine" in post_data["ai_analysis"]

    # List Posts
    list_posts_resp = client.get("/api/posts?blood_group=O+")
    assert list_posts_resp.status_code == 200

    # 3. Direct Messaging
    dm_payload = {
        "sender_id": user_id,
        "sender_name": "Masab Miskat",
        "receiver_id": 999,
        "receiver_name": "Responder Hero",
        "message": "Hi, are you available to donate O+ blood today?",
    }
    dm_resp = client.post("/api/messages", json=dm_payload)
    assert dm_resp.status_code == 200
    assert dm_resp.json()["data"]["sender_name"] == "Masab Miskat"

    # List Messages
    list_msgs = client.get(f"/api/messages/{user_id}/999")
    assert list_msgs.status_code == 200
    assert len(list_msgs.json()["messages"]) >= 1

    # 4. Donor Pledge
    pledge_payload = {
        "donor_id": user_id,
        "donor_name": "Masab Miskat",
        "donor_email": "masabimiskat@gmail.com",
    }
    pledge_resp = client.post("/api/pledges", json=pledge_payload)
    assert pledge_resp.status_code == 200
    assert pledge_resp.json()["pledge"]["donor_name"] == "Masab Miskat"


@pytest.mark.anyio
async def test_verification_otp_email_format_and_delivery():
    from core.emailer import send_verification_otp_email
    res = await send_verification_otp_email(
        email="masabimiskat@gmail.com",
        name="Masab Miskat",
        otp="849201",
        phone="+8801700000000"
    )
    assert res["email"] == "masabimiskat@gmail.com"
    assert res["otp"] == "849201"
    assert res["status"] in ["DELIVERED", "SIMULATED_SENT", "SENT_LOGGED"]
