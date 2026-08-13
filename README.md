# Smart Blood Hub

Monorepo layout:

- `backend/` — FastAPI service for donors, AI matching, email dispatch, and audit logs
- `frontend/` — Next.js app for the user-facing UI

## Run locally

Backend:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Environment files

- `backend/.env.example`
- `frontend/.env.example`

Copy the relevant example file to `.env` or `.env.local` before running.
