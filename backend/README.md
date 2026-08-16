# Smart Blood Hub - AI Agent & Unified Backend Service

The unified **FastAPI + SQLAlchemy + OpenAI + Pinecone** backend service powering the Smart Blood Hub platform.

It handles database management, donor registration, emergency matching, automated email notification dispatches, and real-time audit trail logs.

---

## 🚀 Microservice Features

- 🩸 **Donor Registry Engine**: CRUD API with location & blood group indexing.
- 🤖 **Emergency AI Dispatcher**: Natural language blood search powered by OpenAI & automated email alerts via `aiosmtplib`.
- 📚 **RAG Knowledge Base**: Pinecone vector storage and semantic retrieval for blood donation protocols.
- 📋 **Audit Trail & Analytics**: Queryable audit log APIs, dispatch statistics, re-dispatch capability, and CSV/JSON export support.
- 🔒 **SQLite Database**: Auto-seeding database (`ai_blood_hub.db`) with test datasets.

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status and OpenAI configuration status |
| `POST` | `/api/donors` | Register or update a donor profile |
| `GET` | `/api/donors` | Query registered donors (filtered by `blood_group` & `location`) |
| `POST` | `/api/ai/chat` | Main emergency AI chat assistant + triggers automated email alerts |
| `POST` | `/api/ai/public-chat` | Public inquiry chatbot for donor availability |
| `POST` | `/api/ai/match-request` | AI suitability evaluation for candidate pools |
| `POST` | `/api/ai/knowledge` | Upsert medical/protocol knowledge into Pinecone RAG index |
| `GET` | `/api/logs` | Fetch audit logs with search, group, status, and limit filters |
| `GET` | `/api/logs/stats` | Summary statistics (Total Dispatched, Delivery Success Rate %, Top Group) |
| `GET` | `/api/logs/{id}` | Detailed view of single audit record |
| `POST` | `/api/logs/resend/{id}` | Re-dispatch emergency alert to donor |
| `DELETE` | `/api/logs/{id}` | Delete specific audit log |
| `POST` | `/api/logs/clear` | Clear all audit logs |
| `POST` | `/api/logs/test-trigger` | Generate a simulated test alert audit log |

---

## 📦 Setup & Running (Linux / macOS)

```bash
# Navigate to backend directory
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# then edit .env with your real MongoDB/OpenAI/Pinecone/SMTP credentials
# (and AI_SYSTEM_URL if the ai-system/ microservice runs on a non-default host/port)

# Run FastAPI backend server (Port 8001)
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
# or: python main.py
```

To leave the virtual environment later, run `deactivate`.

---

## 🧪 Running Automated Unit Tests (Linux / macOS)

```bash
cd backend
source .venv/bin/activate
python -m pytest tests/ -q
```
