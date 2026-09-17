from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import db
from app.core.permissions import get_current_active_admin, get_current_user, get_current_staff_or_higher
from app.vector.sync import sync_entity_to_qdrant, delete_entity_from_qdrant

router = APIRouter()

@router.get("/")
async def get_events(active_only: bool = False):
    query = {}
    if active_only:
        query["active"] = True
    cursor = db.events.find(query).sort("created_at", -1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

@router.post("/", dependencies=[Depends(get_current_active_admin)])
async def create_event(data: dict, background_tasks: BackgroundTasks):
    doc = {
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "poster_url": data.get("poster_url", ""),
        "registration_link": data.get("registration_link", ""),
        "coordinator": data.get("coordinator", ""),
        "email": data.get("email", ""),
        "phone": data.get("phone", ""),
        "date": data.get("date", ""),
        "department_id": data.get("department_id", ""),
        "active": data.get("active", True),
        "created_at": datetime.utcnow()
    }
    res = await db.events.insert_one(doc)
    background_tasks.add_task(sync_entity_to_qdrant, "event", str(res.inserted_id), doc)
    return {"id": str(res.inserted_id), "message": "Event created"}

@router.patch("/{event_id}", dependencies=[Depends(get_current_active_admin)])
async def update_event(event_id: str, data: dict, background_tasks: BackgroundTasks):
    update_data = {k: v for k, v in data.items() if k != "id" and k != "_id"}
    update_data["updated_at"] = datetime.utcnow()
    res = await db.events.update_one({"_id": ObjectId(event_id)}, {"$set": update_data})
    
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
        
    updated_doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if updated_doc:
        background_tasks.add_task(sync_entity_to_qdrant, "event", event_id, updated_doc)
        
    return {"message": "Event updated"}

@router.delete("/{event_id}", dependencies=[Depends(get_current_active_admin)])
async def delete_event(event_id: str, background_tasks: BackgroundTasks):
    res = await db.events.delete_one({"_id": ObjectId(event_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    background_tasks.add_task(delete_entity_from_qdrant, "event", event_id)
    return {"message": "Event deleted"}
