import logging
from datetime import datetime, timezone
from pymongo import MongoClient
from config import get_ai_settings

logger = logging.getLogger("ai_system.database")
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
        if "created_at" in doc_copy and isinstance(doc_copy["created_at"], datetime):
            doc_copy["created_at"] = doc_copy["created_at"].isoformat()
        self.documents.append(doc_copy)
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(doc_copy.get("id", doc_copy.get("_id")))

    def count_documents(self, filter_doc: dict | None = None) -> int:
        return len(self.find(filter_doc or {}))

    def find(self, filter_doc: dict | None = None):
        if not filter_doc:
            return list(self.documents)
        results = []
        for doc in self.documents:
            match = True
            for k, v in filter_doc.items():
                if isinstance(v, dict) and "$regex" in v:
                    import re
                    opts = v.get("$options", "")
                    flags = re.IGNORECASE if "i" in opts else 0
                    if not re.search(v["$regex"], str(doc.get(k, "")), flags):
                        match = False
                        break
                elif str(doc.get(k)) != str(v):
                    match = False
                    break
            if match:
                results.append(doc)
        return results


class FallbackMongoDB:

    def __init__(self):
        self.collections = {}

    def __getitem__(self, name: str) -> InMemoryCollection:
        if name not in self.collections:
            self.collections[name] = InMemoryCollection(name)
        return self.collections[name]


try:
    import certifi
    client_kwargs = {"serverSelectionTimeoutMS": 5000, "tlsCAFile": certifi.where()}
except Exception:
    client_kwargs = {"serverSelectionTimeoutMS": 5000}

try:
    mongo_client = MongoClient(settings.mongodb_uri, **client_kwargs)
    mongo_client.admin.command("ping")
    db = mongo_client[settings.mongodb_db_name]
    logger.info(f"Connected to MongoDB Atlas database '{settings.mongodb_db_name}'")
except Exception as err:
    logger.warning(f"Using fallback database store: {err}")
    db = FallbackMongoDB()


def get_db():
    return db
