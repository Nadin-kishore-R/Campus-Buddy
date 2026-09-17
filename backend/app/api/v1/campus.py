from fastapi import APIRouter
from app.db.mongodb import db

router = APIRouter()

@router.get("/departments")
async def get_public_departments():
    cursor = db.departments.find({"active": True}).sort("name", 1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

@router.get("/clubs")
async def get_public_clubs():
    cursor = db.clubs.find({"active": True}).sort("name", 1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

@router.get("/transport")
async def get_public_transport():
    cursor = db.transport.find({"active": True}).sort("route_number", 1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

@router.get("/info")
async def get_public_campus_info():
    cursor = db.campus_data.find({"active": True}).sort("title", 1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

@router.get("/documents")
async def get_public_documents():
    cursor = db.documents.find({"active": True}).sort("created_at", -1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]
