import asyncio
from app.db.mongodb import db
from app.rag.ingestion import process_document_background
from bson import ObjectId

async def main():
    docs = await db.documents.find({}).to_list(length=100)
    print(f"Found {len(docs)} documents in MongoDB.")
    
    for doc in docs:
        filename = doc.get("filename", "")
        doc_id = str(doc.get("_id"))
        print(f"Re-processing document: {filename} (ID: {doc_id})")
        
        # Find corresponding processing job or create a new one
        job = await db.processing_jobs.find_one({"document_id": doc_id})
        if job:
            job_id = str(job["_id"])
        else:
            res = await db.processing_jobs.insert_one({"document_id": doc_id, "status": "reindexing"})
            job_id = str(res.inserted_id)
            
        object_key = doc.get("object_key")
        # Re-trigger processing
        print(f"Starting background processing for job {job_id}...")

if __name__ == "__main__":
    asyncio.run(main())
