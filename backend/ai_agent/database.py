import os
import logging
from datetime import datetime, timezone
from pymongo import MongoClient, errors
from ai_agent.config import get_ai_settings

logger = logging.getLogger("database")

settings = get_ai_settings()


class InMemoryCollection:

    def __init__(self, name: str):
        self.name = name
        self.documents = []
        self._counter = 1

    def insert_one(self, doc: dict):
        doc_copy = dict(doc)
        if "id" not in doc_copy and "_id" not in doc_copy:
            doc_copy["id"] = self._counter
            self._counter += 1
        elif "id" in doc_copy:
            if isinstance(doc_copy["id"], int) and doc_copy["id"] >= self._counter:
                self._counter = doc_copy["id"] + 1

        if "sent_at" in doc_copy and isinstance(doc_copy["sent_at"], datetime):
            doc_copy["sent_at"] = doc_copy["sent_at"].isoformat()
        if "registered_at" in doc_copy and isinstance(doc_copy["registered_at"], datetime):
            doc_copy["registered_at"] = doc_copy["registered_at"].isoformat()
        if "created_at" in doc_copy and isinstance(doc_copy["created_at"], datetime):
            doc_copy["created_at"] = doc_copy["created_at"].isoformat()

        self.documents.append(doc_copy)
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(doc_copy.get("id", doc_copy.get("_id")))

    def insert_many(self, docs: list[dict]):
        for d in docs:
            self.insert_one(d)

    def count_documents(self, filter_doc: dict | None = None) -> int:
        return len(self.find(filter_doc or {}))

    def count(self) -> int:
        return len(self.documents)

    def find_one(self, filter_doc: dict):
        results = self.find(filter_doc)
        return results[0] if results else None

    def find(self, filter_doc: dict | None = None):
        raw_results = []
        if not filter_doc:
            raw_results = list(self.documents)
        else:
            for doc in self.documents:
                match = True
                for k, v in filter_doc.items():
                    if k == "$or" and isinstance(v, list):
                        or_match = False
                        for cond in v:
                            if self._matches_filter(doc, cond):
                                or_match = True
                                break
                        if not or_match:
                            match = False
                            break
                    elif not self._matches_value(doc.get(k), v):
                        match = False
                        break
                if match:
                    raw_results.append(doc)
        
        # Clean ObjectId from documents
        cleaned = []
        for d in raw_results:
            dc = dict(d)
            if "_id" in dc and not isinstance(dc["_id"], (str, int)):
                dc["_id"] = str(dc["_id"])
            cleaned.append(dc)
        return cleaned

    def _matches_filter(self, doc: dict, filter_dict: dict) -> bool:
        for k, v in filter_dict.items():
            if not self._matches_value(doc.get(k), v):
                return False
        return True

    def _matches_value(self, doc_val, target_val) -> bool:
        if isinstance(target_val, dict):
            if "$in" in target_val:
                return doc_val in target_val["$in"]
            if "$regex" in target_val:
                import re
                opts = target_val.get("$options", "")
                flags = re.IGNORECASE if "i" in opts else 0
                return bool(re.search(target_val["$regex"], str(doc_val or ""), flags))
            if "$ilike" in target_val:
                import re
                clean = target_val["$ilike"].replace("%", ".*")
                return bool(re.search(clean, str(doc_val or ""), re.IGNORECASE))
        return doc_val == target_val

    def update_one(self, filter_doc: dict, update_doc: dict):
        # Mutate the ACTUAL stored document (not a cleaned copy)
        for stored_doc in self.documents:
            match = True
            for k, v in filter_doc.items():
                if stored_doc.get(k) != v:
                    match = False
                    break
            if match:
                if "$set" in update_doc:
                    for k, v in update_doc["$set"].items():
                        stored_doc[k] = v
                if "$unset" in update_doc:
                    for k in update_doc["$unset"]:
                        stored_doc.pop(k, None)
                return True
        return False

    def delete_one(self, filter_doc: dict):
        for stored_doc in self.documents:
            match = True
            for k, v in filter_doc.items():
                if stored_doc.get(k) != v:
                    match = False
                    break
            if match:
                self.documents.remove(stored_doc)
                return True
        return False

    def delete_many(self, filter_doc: dict | None = None):
        if not filter_doc:
            cnt = len(self.documents)
            self.documents.clear()
            return cnt
        targets = self.find(filter_doc)
        for t in targets:
            if t in self.documents:
                self.documents.remove(t)
        return len(targets)


class FallbackMongoDB:

    def __init__(self):
        self.collections = {}

    def __getitem__(self, name: str) -> InMemoryCollection:
        if name not in self.collections:
            self.collections[name] = InMemoryCollection(name)
        return self.collections[name]


# Connect exclusively to MongoDB Atlas Cloud Cluster
connection_url = settings.get_mongo_url
client_kwargs = {"serverSelectionTimeoutMS": 5000}

try:
    import certifi
    client_kwargs["tlsCAFile"] = certifi.where()
except Exception:
    pass

try:
    mongo_client = MongoClient(connection_url, **client_kwargs)
    mongo_client.admin.command("ping")  # Ping Atlas Cluster
    db = mongo_client[settings.mongodb_db_name]
    is_real_mongo = True
    logger.info(f"Successfully connected to MongoDB Atlas database '{settings.mongodb_db_name}'")
except Exception as err:
    logger.warning(f"MongoDB Atlas connection notice ({err}). Operating with fallback store.")
    db = FallbackMongoDB()
    is_real_mongo = False


def get_db():
    return db


def init_db():
    users_col = db["users"]
    donors_col = db["donors"]
    posts_col = db["posts"]
    messages_col = db["direct_messages"]
    logs_col = db["notification_logs"]

    # Seed users if empty
    if (users_col.count_documents({}) if hasattr(users_col, "count_documents") else users_col.count()) == 0:
        initial_users = [
            {"id": 1, "name": "Rahat Ahmed", "email": "rahat@example.com", "password_hash": "password123", "blood_group": "O+", "location": "Sylhet", "phone": "+8801711223344", "role": "Donor", "is_verified": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": 2, "name": "Tanvir Hossain", "email": "tanvir@example.com", "password_hash": "password123", "blood_group": "A+", "location": "Dhaka", "phone": "+8801811223344", "role": "Donor", "is_verified": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": 3, "name": "Dr. Farhana Khan", "email": "farhana@example.com", "password_hash": "password123", "blood_group": "AB+", "location": "Sylhet", "phone": "+8801911223344", "role": "Hospital", "is_verified": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        users_col.insert_many(initial_users)

    # Seed donors if empty
    if (donors_col.count_documents({}) if hasattr(donors_col, "count_documents") else donors_col.count()) == 0:
        initial_donors = [
            {"id": 1, "name": "Rahat Ahmed", "email": "rahat@example.com", "phone": "+8801711223344", "blood_group": "O+", "location": "Sylhet", "is_available": True, "registered_at": datetime.now(timezone.utc).isoformat()},
            {"id": 2, "name": "Tanvir Hossain", "email": "tanvir@example.com", "phone": "+8801811223344", "blood_group": "A+", "location": "Dhaka", "is_available": True, "registered_at": datetime.now(timezone.utc).isoformat()},
            {"id": 3, "name": "Nabil Rahman", "email": "nabil@example.com", "phone": "+8801911223344", "blood_group": "B+", "location": "Chittagong", "is_available": True, "registered_at": datetime.now(timezone.utc).isoformat()},
            {"id": 4, "name": "Nusrat Jahan", "email": "nusrat@example.com", "phone": "+8801511223344", "blood_group": "AB+", "location": "Khulna", "is_available": True, "registered_at": datetime.now(timezone.utc).isoformat()},
        ]
        donors_col.insert_many(initial_donors)

    # Seed posts if empty
    if (posts_col.count_documents({}) if hasattr(posts_col, "count_documents") else posts_col.count()) == 0:
        initial_posts = [
            {
                "id": 1,
                "user_id": 3,
                "author_name": "Dr. Farhana Khan",
                "blood_group": "O+",
                "location": "Sylhet",
                "urgency": "CRITICAL",
                "content": "🚨 URGENT: 2 units of O+ blood needed for emergency surgery at Sylhet Medical College Hospital. Please reach out if you can donate today!",
                "ai_analysis": "🤖 AI Match Engine: Located 1 verified O+ donor in Sylhet (Rahat Ahmed). Dispatch alerts sent.",
                "matched_donor_count": 1,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "id": 2,
                "user_id": 2,
                "author_name": "Tanvir Hossain",
                "blood_group": "A+",
                "location": "Dhaka",
                "urgency": "HIGH",
                "content": "Seeking A+ blood donor for dengue patient in Square Hospital, Dhaka. Requirement needed within 4 hours.",
                "ai_analysis": "🤖 AI Match Engine: Located 1 verified A+ donor in Dhaka (Tanvir Hossain). Dispatch alerts sent.",
                "matched_donor_count": 1,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        ]
        posts_col.insert_many(initial_posts)

    # Seed messages if empty
    if (messages_col.count_documents({}) if hasattr(messages_col, "count_documents") else messages_col.count()) == 0:
        initial_messages = [
            {
                "id": 1,
                "sender_id": 3,
                "sender_name": "Dr. Farhana Khan",
                "receiver_id": 1,
                "receiver_name": "Rahat Ahmed",
                "message": "Hello Rahat! We saw your O+ donor profile in Sylhet. Are you available for an emergency donation at Sylhet Medical College?",
                "sent_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "id": 2,
                "sender_id": 1,
                "sender_name": "Rahat Ahmed",
                "receiver_id": 3,
                "receiver_name": "Dr. Farhana Khan",
                "message": "Hi Dr. Farhana! Yes, I am available and can reach the hospital within 30 minutes.",
                "sent_at": datetime.now(timezone.utc).isoformat(),
            },
        ]
        messages_col.insert_many(initial_messages)

    # Seed logs if empty
    if (logs_col.count_documents({}) if hasattr(logs_col, "count_documents") else logs_col.count()) == 0:
        initial_logs = [
            {
                "id": 1,
                "donor_name": "Rahat Ahmed",
                "donor_email": "rahat@example.com",
                "blood_group": "O+",
                "location": "Sylhet",
                "message_content": "Hello Rahat Ahmed,\n\nAn emergency request for O+ blood in Sylhet was reported!\n\nRequester Details:\n\"URGENT: 2 units of O+ blood needed for emergency surgery\"\n\nSmart Blood Hub Team",
                "status": "DELIVERED",
                "sent_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "id": 2,
                "donor_name": "Tanvir Hossain",
                "donor_email": "tanvir@example.com",
                "blood_group": "A+",
                "location": "Dhaka",
                "message_content": "Hello Tanvir Hossain,\n\nAn emergency request for A+ blood in Dhaka was reported!\n\nRequester Details:\n\"Seeking A+ blood donor for dengue patient\"\n\nSmart Blood Hub Team",
                "status": "DELIVERED",
                "sent_at": datetime.now(timezone.utc).isoformat(),
            },
        ]
        logs_col.insert_many(initial_logs)
