# Smart Blood Hub - Frontend Application

A modern, high-performance **Next.js 16 + React 19 + Tailwind CSS v4** Emergency Donor Matching & Automated Alert Dispatch user interface.

> ℹ️ **Architecture Note**: All backend services (Database, OpenAI Agent, Automated Email Dispatcher, RAG Indexing, and Audit Trail APIs) are consolidated into the [`backend`](../backend) FastAPI service.

---

## 🚀 Key Features

- 🤖 **Emergency AI Assistant**: Conversational donor search and automated dispatch trigger.
- 🩸 **Verified Donor Registry**: Real-time donor listing with blood group and area filtering.
- 📋 **Audit Trail & Logs**: Real-time dispatch logs with CSV/JSON exports, search, status filters, and resend capability.
- ⚡ **Dynamic UI**: Encrypted registry badges, live metric counters, and glassmorphism styling.

---

## 📦 Getting Started

### 1. Prerequisite: Start the AI Agent Backend
Ensure the FastAPI backend service in `backend` is running on `http://localhost:8001`.

```bash
cd ../backend
python main.py
```

### 2. Start Frontend Server
From this directory (`frontend`):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Configuration

Set `NEXT_PUBLIC_API_URL` in `.env.local` if using a custom backend URL (defaults to `http://localhost:8001/api`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8001/api
```
