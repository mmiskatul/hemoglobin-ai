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

## 🚀 Running Locally

### 1. Dedicated AI System Microservice (Port 8002)
```bash
cd ai-system
pip install -r requirements.txt
python main.py
```

### 2. Main Backend (Port 8000)
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 3. Frontend Application (Port 3000)
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ Environment Configuration

- `ai-system/.env.example`
- `backend/.env.example`
- `frontend/.env.example`

Copy each example file to `.env` or `.env.local` with your respective credentials (OpenAI, Pinecone, MongoDB Atlas, Gmail SMTP).
