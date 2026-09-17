import os
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import db
from app.documents.factory import get_parser
from app.rag.chunking import chunk_document
from app.embeddings.embedding_service import embedding_service
from app.vector.qdrant_client import qdrant_client
from app.config import settings

async def process_document_background(job_id: str, document_id: str, file_path: str, filename: str):
    """Background task to extract text, chunk, embed, and store vectors."""
    try:
        # 1. Update job status
        await db.processing_jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "processing", "started_at": datetime.utcnow()}}
        )

        # 2. Extract Text
        parser = get_parser(filename)
        if not parser:
            raise ValueError(f"No parser found for file type: {filename}")
        
        async def status_updater(msg: str):
            await db.processing_jobs.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": {"status": msg}}
            )

        if hasattr(parser, "parse_async"):
            raw_chunks = await parser.parse_async(file_path, status_updater=status_updater)
        else:
            raw_chunks = parser.parse(file_path)

        if not raw_chunks:
            raise ValueError("No text could be extracted from the document.")

        # 3. Chunking
        await status_updater("Chunking")
        final_chunks = chunk_document(raw_chunks)
        if not final_chunks:
            raise ValueError("No valid chunks generated after chunking.")

        # 4. Fetch document metadata for Qdrant payload
        doc_meta = await db.documents.find_one({"_id": ObjectId(document_id)})
        if not doc_meta:
            raise ValueError(f"Document metadata not found for ID: {document_id}")

        # 5. Embed and Index
        await status_updater("Embedding")
        points = []
        for idx, chunk in enumerate(final_chunks):
            embedding = embedding_service.embed_text(chunk.text)
            payload = {
                "document_id": document_id,
                "chunk_id": f"{document_id}_{idx}",
                "department_id": doc_meta.get("departments", []),
                "club_id": doc_meta.get("club_id"),
                "category_id": doc_meta.get("category_id"),
                "subcategory_id": doc_meta.get("subcategory_id"),
                "access_level": doc_meta.get("access_level"),
                "academic_year": doc_meta.get("academic_year"),
                "semester": doc_meta.get("semester"),
                "active": doc_meta.get("active", True),
                "version": doc_meta.get("version", 1),
                "document_type": doc_meta.get("document_type"),
                "filename": doc_meta.get("filename"),
                "page": chunk.page,
                "section": chunk.section,
                "sheet": chunk.sheet,
                "row": chunk.row,
                "chunk_text": chunk.text
            }
            points.append((payload["chunk_id"], embedding, payload))
        
        qdrant_client.upsert_points(points)

        # 6. Update Success Status
        await db.processing_jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {
                "status": "processed", 
                "completed_at": datetime.utcnow(),
                "chunks_created": len(final_chunks),
                "vectors_stored": len(final_chunks)
            }}
        )
        await db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {"status": "processed", "updated_at": datetime.utcnow()}}
        )

    except Exception as e:
        print(f"Error processing document {document_id}: {e}")
        # Update Failure Status
        await db.processing_jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {
                "status": "failed", 
                "error": str(e),
                "completed_at": datetime.utcnow()
            }}
        )
        await db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {"status": "failed", "processing_error": str(e), "updated_at": datetime.utcnow()}}
        )
