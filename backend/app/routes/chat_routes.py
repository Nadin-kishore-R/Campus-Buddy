import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from database.mongo import db_manager
from services.auth import get_current_user
from services.rag_engine import rag_engine

router = APIRouter(prefix="/api/chat", tags=["Student & Guest Chat"])

class QueryRequest(BaseModel):
    session_id: Optional[str] = None
    question: str
    category: Optional[str] = None

class QueryResponse(BaseModel):
    session_id: str
    student_id: Optional[str]
    question: str
    answer: str
    sources: List[Dict[str, Any]]

@router.post("/query", response_model=QueryResponse)
def chat_query(
    req: QueryRequest,
    current_user: dict = Depends(get_current_user)
):
    """Executes RAG search and LLM inference.
    If authenticated as Student, retrieves past conversation history from MongoDB,
    passes it into the model generation pipeline, and saves the new turn to MongoDB.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question text cannot be empty.")

    role = current_user.get("role", "guest")
    student_id = current_user.get("student_id") or current_user.get("username")
    session_id = req.session_id or f"session_{uuid.uuid4().hex[:8]}"

    chat_history_messages = []

    # Fetch previous conversation history if student is logged in
    if role == "student" and student_id:
        existing_session = db_manager.get_chat_session(session_id)
        if existing_session and "messages" in existing_session:
            chat_history_messages = existing_session["messages"]

    # Run RAG Generation with Vector Search + History memory + Ollama LLM
    result = rag_engine.generate_response(
        question=req.question,
        chat_history=chat_history_messages,
        category=req.category
    )

    title = req.question[:30] + ("..." if len(req.question) > 30 else "")

    # Save turn to MongoDB if student user
    if role == "student" and student_id:
        db_manager.save_chat_turn(
            session_id=session_id,
            student_id=student_id,
            title=title,
            user_query=req.question,
            bot_response=result["answer"],
            sources=result["sources"]
        )

    return {
        "session_id": session_id,
        "student_id": student_id if role == "student" else None,
        "question": req.question,
        "answer": result["answer"],
        "sources": result["sources"]
    }

@router.get("/history")
def get_student_chat_history(current_user: dict = Depends(get_current_user)):
    """Retrieves all previous conversation history sessions for the authenticated student."""
    role = current_user.get("role", "guest")
    if role != "student":
        return {"sessions": []}

    student_id = current_user.get("student_id") or current_user.get("username")
    sessions = db_manager.get_student_sessions(student_id)
    return {"sessions": sessions}

@router.get("/history/{session_id}")
def get_session_details(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retrieves detailed message exchange history for a specific chat session."""
    session = db_manager.get_chat_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Chat session '{session_id}' not found.")
    return session

@router.delete("/history/{session_id}")
def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Deletes a student's chat session from MongoDB."""
    success = db_manager.delete_chat_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found or already deleted.")
    return {"message": f"Chat session '{session_id}' deleted."}
