import uuid
import tempfile
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query
from pydantic import BaseModel
from database.mongo import db_manager
from database.minio_client import minio_storage
from services.auth import require_admin
from services.document_loader import process_file_into_chunks
from services.vector_store import vector_store

router = APIRouter(prefix="/api/admin", tags=["Admin Data Management"])

@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    category: str = Form("General"),
    current_user: dict = Depends(require_admin)
):
    """Admin endpoint to upload a PDF/Document into MinIO object store,
    save metadata into MongoDB, and dynamically chunk & index vectors in Qdrant Vector DB.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is empty.")

    ext = Path(file.filename).suffix.lower()
    if ext not in [".pdf", ".txt", ".md"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, TXT, or MD.")

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    minio_object_name = f"{doc_id}_{file.filename}"

    # Write temporary file to disk for processing
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        # 1. Upload to MinIO object storage
        minio_uri = minio_storage.upload_file(minio_object_name, tmp_path, content_type=file.content_type or "application/pdf")

        # 2. Extract text and generate chunks
        chunk_records = process_file_into_chunks(tmp_path, doc_id=doc_id, filename=file.filename, category=category)

        # 3. Dynamic Vector Store update (Upsert into Qdrant)
        indexed_count = 0
        if chunk_records:
            indexed_count = vector_store.add_documents(chunk_records)

        # 4. Save metadata in MongoDB
        metadata = {
            "doc_id": doc_id,
            "filename": file.filename,
            "minio_object_name": minio_object_name,
            "minio_uri": minio_uri,
            "category": category,
            "file_size": len(content),
            "uploaded_by": current_user["username"],
            "chunk_count": len(chunk_records),
            "vector_count": indexed_count
        }
        db_manager.save_document_metadata(metadata)

        return {
            "message": "Document successfully uploaded and indexed into Vector DB.",
            "document": metadata
        }

    finally:
        # Cleanup tmp file
        if tmp_path.exists():
            tmp_path.unlink()

@router.get("/documents")
def list_documents(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search filename keyword"),
    current_user: dict = Depends(require_admin)
):
    """Lists all stored documents with optional category and search filters."""
    docs = db_manager.get_documents(category=category, search=search)
    return {
        "count": len(docs),
        "documents": docs
    }

@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: str,
    current_user: dict = Depends(require_admin)
):
    """Deletes document metadata from MongoDB, removes object from MinIO,
    and dynamically removes associated points from Qdrant Vector Store.
    """
    # 1. Fetch metadata
    docs = db_manager.get_documents()
    target_doc = next((d for d in docs if d["doc_id"] == doc_id), None)
    if not target_doc:
        raise HTTPException(status_code=404, detail=f"Document with ID '{doc_id}' not found.")

    # 2. Delete from MinIO object storage
    minio_storage.delete_file(target_doc["minio_object_name"])

    # 3. Dynamic Vector DB point removal
    vector_store.delete_by_doc_id(doc_id)

    # 4. Delete metadata from MongoDB
    db_manager.delete_document_metadata(doc_id)

    return {
        "message": f"Document '{target_doc['filename']}' (ID: {doc_id}) dynamically removed from MinIO, MongoDB, and Vector DB.",
        "deleted_doc_id": doc_id
    }

@router.post("/reindex")
def reindex_all_documents(current_user: dict = Depends(require_admin)):
    """Re-indexes all existing documents in storage into Qdrant Vector Store."""
    docs = db_manager.get_documents()
    if not docs:
        return {"message": "No documents to re-index.", "total_indexed": 0}

    # Clear existing vector collection
    vector_store.clear_collection()
    total_chunks = 0

    for doc in docs:
        local_path = minio_storage.get_file_path(doc["minio_object_name"])
        if local_path.exists():
            chunks = process_file_into_chunks(local_path, doc_id=doc["doc_id"], filename=doc["filename"], category=doc.get("category", "General"))
            if chunks:
                vector_store.add_documents(chunks)
                total_chunks += len(chunks)

    return {
        "message": f"Re-indexed {len(docs)} documents successfully.",
        "total_documents": len(docs),
        "total_chunks_indexed": total_chunks
    }

# --- ACCESS MANAGEMENT & USER CONTROL ENDPOINTS ---
class GrantAccessRequest(BaseModel):
    username: str
    password: str
    role: str = "student"  # "admin" or "student"
    student_id: Optional[str] = None
    full_name: Optional[str] = None

@router.get("/users")
def get_users_list(current_user: dict = Depends(require_admin)):
    """Fetches list of all accounts registered in MongoDB."""
    users = db_manager.get_all_users()
    return {
        "count": len(users),
        "users": users
    }

@router.post("/users/grant-access")
def grant_user_access(req: GrantAccessRequest, current_user: dict = Depends(require_admin)):
    """Allows an Administrator/Principal to directly create or grant access to a user (Admin/Student)."""
    # Import hash_password lazily to prevent circular import
    from services.auth import hash_password
    
    existing = db_manager.get_user_by_username(req.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User '{req.username}' already exists in system database."
        )

    student_id = req.student_id or (f"STU-{uuid.uuid4().hex[:6].upper()}" if req.role == "student" else None)
    
    user_data = {
        "username": req.username,
        "email": req.username,
        "password_hash": hash_password(req.password),
        "role": req.role,
        "student_id": student_id,
        "full_name": req.full_name or req.username,
        "created_by": current_user["username"]
    }
    db_manager.create_user(user_data)

    return {
        "message": f"Access granted successfully. User '{req.username}' created as '{req.role}'.",
        "user": {
            "username": req.username,
            "role": req.role,
            "student_id": student_id,
            "created_by": current_user["username"]
        }
    }

@router.delete("/users/{username}")
def revoke_user_access(username: str, current_user: dict = Depends(require_admin)):
    """Revokes/Deletes a user account from MongoDB."""
    if username.lower() == current_user["username"].lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own active Administrator session."
        )

    success = db_manager.delete_user(username)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{username}' not found."
        )

    return {
        "message": f"User '{username}' access revoked and account deleted from MongoDB."
    }

