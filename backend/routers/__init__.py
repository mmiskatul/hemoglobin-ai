from fastapi import APIRouter
from routers.auth import router as auth_router
from routers.donors import router as donors_router
from routers.posts import router as posts_router
from routers.messages import router as messages_router
from routers.logs import router as logs_router
from ai.router import router as ai_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(donors_router)
api_router.include_router(posts_router)
api_router.include_router(messages_router)
api_router.include_router(logs_router)
api_router.include_router(ai_router)

__all__ = [
    "api_router",
    "auth_router",
    "donors_router",
    "posts_router",
    "messages_router",
    "logs_router",
    "ai_router",
]
