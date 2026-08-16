# 🩸 Smart Blood Hub (Hemoglobin AI)

An AI-powered emergency blood donor registry, automated dispatch coordinator, and intelligent triage platform.

![Smart Blood Hub AI System Architecture](docs/ai_system_architecture.jpg)

---

## 📊 AI Decision & Workflow Pipeline

![Smart Blood Hub AI Decision & Workflow Pipeline](docs/ai_flow.jpg)

For a complete architectural breakdown, refer to [AI_SYSTEM_ARCHITECTURE.md](AI_SYSTEM_ARCHITECTURE.md).

---

## 📂 Monorepo Architecture

- **`ai-system/`** — Dedicated AI microservice (FastAPI, OpenAI GPT-4o, Pinecone Vector RAG).
- **`backend/`** — Core backend service for donor registry, user auth, emergency posts, messaging, SMTP alerts, and audit logs.
- **`frontend/`** — Next.js web application for users, hospitals, and donors.
- **`docs/`** — System architecture diagrams and visual assets.

---

## 🚀 Running Locally (Linux / macOS)

Run each service in its own terminal.

### 1. Dedicated AI System Microservice (Port 8002)
```bash
cd ai-system
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in real credentials
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### 2. Main Backend (Port 8001)
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in real credentials
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend Application (Port 3000)
Requires Node.js **>= 20.9.0** (check with `node --version`; use `nvm install 20 && nvm use 20` if needed).
```bash
cd frontend
cp .env.example .env.local   # defaults to http://localhost:8001/api
npm install
npm run dev
```

---

## ⚙️ Environment Configuration

- `ai-system/.env.example`
- `backend/.env.example`
- `frontend/.env.example`

Copy each example file to `.env` or `.env.local` with your respective credentials (OpenAI, Pinecone, MongoDB Atlas, Gmail SMTP).
