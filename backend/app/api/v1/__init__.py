from fastapi import APIRouter
from app.api.v1 import auth, admin, documents, chat, health, campus, events

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(campus.router, prefix="/campus", tags=["campus"])
api_router.include_router(events.router, prefix="/events", tags=["events"])

