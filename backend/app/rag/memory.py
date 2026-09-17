from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from bson import ObjectId
from app.db.mongodb import db
from app.llm.ollama_client import ollama_client

async def summarize_conversation(messages: List[Dict[str, str]]) -> str:
    """Uses LLM to summarize a list of messages."""
    prompt = "Please summarize the following conversation concisely:\n\n"
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        prompt += f"{role.capitalize()}: {content}\n"
        
    messages_for_llm = [
        {"role": "system", "content": "You are a summarization assistant. Summarize the conversation concisely."},
        {"role": "user", "content": prompt}
    ]
    
    summary = await ollama_client.generate_chat_completion(messages_for_llm, max_tokens=256)
    return summary.strip()

async def get_conversation_context(conversation_id: str, is_guest: bool = False) -> Tuple[List[Dict[str, str]], str]:
    """
    Retrieves recent messages and summary for a given conversation.
    Returns (recent_messages, summary_string)
    """
    if is_guest:
        session = await db.guest_sessions.find_one({"guest_session_id": conversation_id})
        if not session:
            return [], ""
        messages = session.get("messages", [])
        
        formatted_messages = []
        for m in messages[-10:]:  # last 10 messages for guests
            msg_content = m.get("content", "")
            ocr_text = m.get("image_ocr_text", "")
            if ocr_text:
                msg_content = f"{msg_content}\n\n[Attached Image Content (OCR Extracted)]:\n{ocr_text}".strip()
            formatted_messages.append({"role": m["role"], "content": msg_content})
        return formatted_messages, ""
        
    # Authenticated User
    conv = await db.conversations.find_one({"conversation_id": conversation_id})
    if not conv:
        return [], ""
        
    summary = conv.get("summary", "")
    
    # Get last 10 messages
    cursor = db.messages.find({"conversation_id": conversation_id}).sort("created_at", -1).limit(10)
    recent_messages = await cursor.to_list(length=10)
    recent_messages.reverse()
    
    formatted_messages = []
    for m in recent_messages:
        msg_content = m.get("content", "")
        ocr_text = m.get("image_ocr_text", "")
        if ocr_text:
            msg_content = f"{msg_content}\n\n[Attached Image Content (OCR Extracted)]:\n{ocr_text}".strip()
        formatted_messages.append({"role": m["role"], "content": msg_content})
        
    return formatted_messages, summary

async def add_message_to_conversation(
    conversation_id: str,
    role: str,
    content: str,
    sources: List[dict] = None,
    is_guest: bool = False,
    user_id: str = None,
    image_base64: str = None,
    image_ocr_text: str = None
):
    """Adds a message to history and conditionally summarizes if it gets too long."""
    if is_guest:
        msg = {
            "role": role,
            "content": content,
            "sources": sources or [],
            "image_base64": image_base64,
            "image_ocr_text": image_ocr_text,
            "created_at": datetime.utcnow()
        }
        await db.guest_sessions.update_one(
            {"guest_session_id": conversation_id},
            {"$push": {"messages": msg}}
        )
        return

    # Authenticated user
    msg_doc = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "sources": sources or [],
        "image_base64": image_base64,
        "image_ocr_text": image_ocr_text,
        "created_at": datetime.utcnow()
    }
    await db.messages.insert_one(msg_doc)
    
    # Upsert conversation document
    conv = await db.conversations.find_one({"conversation_id": conversation_id})
    if not conv:
        title = content[:60] if role == "user" else "Campus Inquiry"
        await db.conversations.insert_one({
            "conversation_id": conversation_id,
            "user_id": user_id,
            "title": title,
            "message_count": 1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
    else:
        update_fields = {"updated_at": datetime.utcnow()}
        if user_id and not conv.get("user_id"):
            update_fields["user_id"] = user_id
        await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {
                "$inc": {"message_count": 1},
                "$set": update_fields
            }
        )
    
    # Check if summarization is needed (e.g., every 10 messages)
    if conv and conv.get("message_count", 0) > 0 and conv.get("message_count", 0) % 10 == 0:
        cursor = db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1)
        all_msgs = await cursor.to_list(length=None)
        
        formatted_messages = []
        for m in all_msgs:
            m_content = m.get("content", "")
            m_ocr = m.get("image_ocr_text", "")
            if m_ocr:
                m_content = f"{m_content}\n[Attached Image Content (OCR Extracted)]:\n{m_ocr}".strip()
            formatted_messages.append({"role": m.get("role", "user"), "content": m_content})
            
        new_summary = await summarize_conversation(formatted_messages)
        
        await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {"summary": new_summary}}
        )

