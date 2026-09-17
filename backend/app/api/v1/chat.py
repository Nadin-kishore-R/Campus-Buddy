from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.permissions import get_optional_user
from app.rag.pipeline import generate_rag_response
from app.db.mongodb import db
import uuid

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    conversation_id: str
    is_guest: bool = False
    requested_scope: Optional[dict] = None
    image_base64: Optional[str] = None

@router.post("/")
async def chat(
    request: ChatRequest,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    user_profile = current_user if current_user else {"role": "guest"}
    
    if request.is_guest:
        # Verify guest session exists or create one
        session = await db.guest_sessions.find_one({"guest_session_id": request.conversation_id})
        if not session:
            raise HTTPException(status_code=404, detail="Guest session not found")
            
    response = await generate_rag_response(
        question=request.question,
        conversation_id=request.conversation_id,
        user_profile=user_profile,
        is_guest=request.is_guest,
        requested_scope=request.requested_scope,
        image_base64=request.image_base64
    )
    
    return response

from fastapi.responses import StreamingResponse

@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    from app.rag.pipeline import generate_rag_stream
    user_profile = current_user if current_user else {"role": "guest"}
    
    if request.is_guest:
        session = await db.guest_sessions.find_one({"guest_session_id": request.conversation_id})
        if not session:
            raise HTTPException(status_code=404, detail="Guest session not found")
            
    return StreamingResponse(
        generate_rag_stream(
            question=request.question,
            conversation_id=request.conversation_id,
            user_profile=user_profile,
            is_guest=request.is_guest,
            requested_scope=request.requested_scope,
            image_base64=request.image_base64
        ),
        media_type="text/event-stream"
    )

@router.post("/guest/session")
async def create_guest_session():
    session_id = str(uuid.uuid4())
    from datetime import datetime, timedelta
    from app.config import settings
    
    session = {
        "guest_session_id": session_id,
        "messages": [],
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(hours=settings.GUEST_SESSION_TTL_HOURS),
        "status": "active"
    }
    await db.guest_sessions.insert_one(session)
    return {"guest_session_id": session_id, "expires_at": session["expires_at"]}

@router.get("/conversations")
async def get_user_conversations(current_user: Optional[dict] = Depends(get_optional_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required to view conversation history.")
    user_id = str(current_user.get("_id") or current_user.get("id"))
    cursor = db.conversations.find({"user_id": user_id}).sort("updated_at", -1).limit(100)
    convs = [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]
    return convs

@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    cursor = db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1)
    msgs = [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]
    return msgs

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    user_id = str(current_user.get("_id") or current_user.get("id"))
    await db.conversations.delete_one({"conversation_id": conversation_id, "user_id": user_id})
    await db.messages.delete_many({"conversation_id": conversation_id})
    return {"message": "Conversation deleted successfully."}

