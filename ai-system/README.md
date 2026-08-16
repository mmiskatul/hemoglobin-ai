# 🤖 Smart Blood Hub - Dedicated AI System

A standalone microservice and core package dedicated **exclusively** to the AI System of Smart Blood Hub.

![Smart Blood Hub AI System Architecture](docs/ai_system_architecture.jpg)

---

## 📊 AI Decision & Workflow Pipeline

![Smart Blood Hub AI Decision & Workflow Pipeline](docs/ai_flow.jpg)

---

## 🚀 Features

- **OpenAI LLM Reasoning Engine**: Natural language understanding, donor suitability analysis, and emergency query triage.
- **Pinecone Vector RAG**: Semantic similarity matching and automated retrieval of blood bank medical and logistics knowledge.
- **Intent Recognition & Entity Extraction**: Automatically parses blood groups (`A+`, `O-`, etc.) and target locations from unstructured messages.
- **Matching & Priority Dispatch Logistics**: Generates AI recommendations for incoming blood requests against candidate donor pools.
- **Zero Monolithic Dependencies**: Contains only the AI system components (no general CRUD, user management, or UI logic).

---

## 📂 Architecture

```
ai-system/
├── main.py             # Standalone FastAPI microservice entrypoint (Port 8002)
├── config.py           # AI System configuration & environment settings
├── agent.py            # AI Coordinator, intent parsing & LLM execution
├── rag.py              # Pinecone embeddings & semantic knowledge retrieval
├── prompts.py          # System prompt engineering and guidelines
├── schemas.py          # Pydantic data schemas for AI requests & responses
├── requirements.txt    # Dedicated lightweight Python dependencies
├── Dockerfile          # Container definition
├── docs/               # Architecture diagrams
├── tests/              # Dedicated AI unit tests
└── README.md
```

---

## 🛠️ Quickstart (Linux / macOS)

### 1. Install Dependencies
```bash
cd ai-system

# Create and activate a dedicated virtual environment
python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in real values (use the same MongoDB/OpenAI/Pinecone credentials as `backend/.env` so both services read/write the same donor data, RAG index, and LLM account):
```bash
cp .env.example .env
# then edit .env with your real credentials
```
```env
HOST=0.0.0.0
PORT=8002

MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ai_blood_hub?retryWrites=true&w=majority
MONGODB_DB_NAME=ai_blood_hub

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

PINECONE_API_KEY=...
PINECONE_INDEX_NAME=hemoglobin-knowledge
PINECONE_INDEX_HOST=
PINECONE_NAMESPACE=hemoglobin-knowledge
```

The Core Backend (`backend/`) talks to this service over HTTP via its `AI_SYSTEM_URL` setting (default `http://localhost:8002`, see `backend/.env.example`) and falls back to its own in-process AI logic if this service isn't running.

### 3. Run the AI Microservice
```bash
cd ai-system
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

To leave the virtual environment later, run `deactivate`.

### 4. Running Automated Unit Tests
```bash
cd ai-system
source .venv/bin/activate
python -m pytest tests/ -q
```

---

## 📡 API Endpoints

- `GET /health` - Health status of AI service & connected AI providers
- `POST /ai/chat` - Main AI coordinator chat with donor matching analysis
- `POST /ai/public-chat` - Public guidance chat
- `POST /ai/match-request` - Structured AI matching logistics recommendations
- `POST /ai/knowledge` - Index documents into the Pinecone RAG vector store
