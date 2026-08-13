from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ai_agent.config import get_ai_settings
from ai_agent.database import init_db
from ai_agent.router import router as ai_router
from bson import ObjectId
from fastapi.encoders import ENCODERS_BY_TYPE

ENCODERS_BY_TYPE[ObjectId] = str

settings = get_ai_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Smart Blood Hub AI Agent Backend",
    description="Unified Backend & AI Microservice providing Donor Registry, Automated Email Dispatches, and OpenAI Chat Assistance",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ai-agent-backend",
        "openai_configured": bool(settings.openai_api_key),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
