from fastapi import APIRouter
from app.db.mongodb import db
from app.vector.qdrant_client import qdrant_client
from app.llm.ollama_client import ollama_client
# Assuming minio client check is implemented

router = APIRouter()

@router.get("/")
async def health_check():
    return {"status": "ok"}

@router.get("/mongodb")
async def mongodb_health():
    try:
        await db.db.command("ping")
        return {"status": "ok", "service": "mongodb"}
    except Exception as e:
        return {"status": "error", "service": "mongodb", "message": str(e)}

@router.get("/qdrant")
async def qdrant_health():
    try:
        collections = qdrant_client.client.get_collections()
        return {"status": "ok", "service": "qdrant", "collections": len(collections.collections)}
    except Exception as e:
        return {"status": "error", "service": "qdrant", "message": str(e)}
