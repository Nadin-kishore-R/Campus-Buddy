from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import db
from app.core.permissions import get_current_active_admin, get_current_user, get_current_staff_or_higher
from app.core.security import get_password_hash, create_access_token
from app.vector.sync import sync_entity_to_qdrant, delete_entity_from_qdrant
from datetime import timedelta

router = APIRouter()

# ─── User Management ───────────────────────────────────────────

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "student"           # student | faculty | admin
    student_id: Optional[str] = None
    department_id: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department_id: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    active: Optional[bool] = None

class AdminResetPasswordRequest(BaseModel):
    new_password: str

def serialize_user(u: dict) -> dict:
    u = dict(u)
    u["id"] = str(u.pop("_id"))
    u.pop("password_hash", None)
    return u


@router.get("/users", dependencies=[Depends(get_current_staff_or_higher)])
async def list_users(
    role: Optional[str] = None, 
    active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if role:
        query["role"] = role
    if active is not None:
        query["active"] = active

    caller_role = current_user.get("role")
    caller_dept = current_user.get("department_id")

    # If faculty, can only view students in their department
    if caller_role == "faculty":
        query["department_id"] = caller_dept
        query["role"] = "student"
    # If HOD, can view anyone in their department
    elif caller_role == "hod":
        query["department_id"] = caller_dept

    cursor = db.users.find(query).sort("created_at", -1)
    users = await cursor.to_list(length=500)
    return [serialize_user(u) for u in users]


@router.post("/users", dependencies=[Depends(get_current_staff_or_higher)])
async def create_user(
    body: CreateUserRequest,
    current_user: dict = Depends(get_current_user)
):
    caller_role = current_user.get("role")
    caller_dept = current_user.get("department_id")

    # Role Hierarchy Check
    if caller_role == "faculty":
        if body.role != "student":
            raise HTTPException(status_code=403, detail="Staff can only create students.")
        if body.department_id != caller_dept:
            raise HTTPException(status_code=403, detail="Staff can only create students in their own department.")
    elif caller_role == "hod":
        if body.role not in ["student", "faculty", "technical_staff"]:
            raise HTTPException(status_code=403, detail="HOD cannot create admins or other HODs.")
        if body.department_id != caller_dept:
            raise HTTPException(status_code=403, detail="HOD can only create users in their own department.")

    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    if body.student_id:
        dup = await db.users.find_one({"student_id": body.student_id})
        if dup:
            raise HTTPException(status_code=400, detail="Student ID already registered.")

    user_doc = {
        "email":         body.email,
        "password_hash": get_password_hash(body.password),
        "name":          body.name,
        "role":          body.role,
        "student_id":    body.student_id,
        "department_id": body.department_id,
        "year":          body.year,
        "section":       body.section,
        "club_ids":      [],
        "active":        True,
        "created_at":    datetime.utcnow(),
        "updated_at":    datetime.utcnow(),
    }
    result = await db.users.insert_one(user_doc)
    return {"message": "User created successfully.", "id": str(result.inserted_id)}


@router.patch("/users/{user_id}", dependencies=[Depends(get_current_staff_or_higher)])
async def update_user(
    user_id: str, 
    body: UpdateUserRequest,
    current_user: dict = Depends(get_current_user)
):
    caller_role = current_user.get("role")
    caller_dept = current_user.get("department_id")
    
    target_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if caller_role == "faculty":
        if target_user.get("role") != "student" or target_user.get("department_id") != caller_dept:
            raise HTTPException(status_code=403, detail="Staff can only modify students in their own department.")
    elif caller_role == "hod":
        if target_user.get("department_id") != caller_dept:
            raise HTTPException(status_code=403, detail="HOD can only modify users in their own department.")
        if target_user.get("role") == "admin":
            raise HTTPException(status_code=403, detail="HOD cannot modify admins.")

    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")
    update_data["updated_at"] = datetime.utcnow()
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    return {"message": "User updated."}


@router.delete("/users/{user_id}", dependencies=[Depends(get_current_staff_or_higher)])
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Soft-delete: set active=False."""
    caller_role = current_user.get("role")
    caller_dept = current_user.get("department_id")
    
    target_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if caller_role == "faculty":
        if target_user.get("role") != "student" or target_user.get("department_id") != caller_dept:
            raise HTTPException(status_code=403, detail="Staff can only deactivate students in their own department.")
    elif caller_role == "hod":
        if target_user.get("department_id") != caller_dept:
            raise HTTPException(status_code=403, detail="HOD can only deactivate users in their own department.")
        if target_user.get("role") == "admin":
            raise HTTPException(status_code=403, detail="HOD cannot deactivate admins.")

    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"active": False, "updated_at": datetime.utcnow()}}
    )
    return {"message": "User deactivated."}


@router.post("/users/{user_id}/reset-password", dependencies=[Depends(get_current_active_admin)])
async def admin_reset_password(user_id: str, body: AdminResetPasswordRequest):
    new_hash = get_password_hash(body.new_password)
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")
    # Revoke sessions
    await db.sessions.delete_many({"user_id": user_id})
    return {"message": "Password reset successfully."}


@router.post("/users/{user_id}/generate-reset-link", dependencies=[Depends(get_current_active_admin)])
async def generate_reset_link_for_user(user_id: str):
    """Admin generates a reset token they can share with a student."""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    token = create_access_token(subject=user_id, expires_delta=timedelta(minutes=60))
    await db.password_reset_tokens.insert_one({
        "user_id":    user_id,
        "token":      token,
        "used":       False,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=60),
    })
    return {"reset_token": token, "expires_in_minutes": 60}


# ─── Content management & CRUD ────────────────────────────

@router.get("/stats", dependencies=[Depends(get_current_staff_or_higher)])
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    try:
        caller_role = current_user.get("role")
        caller_dept = current_user.get("department_id")
        
        user_query = {}
        doc_query = {}
        
        if caller_role in ["faculty", "hod"]:
            user_query["department_id"] = caller_dept
            doc_query["department_id"] = caller_dept
            if caller_role == "faculty":
                user_query["role"] = "student"
                
        total_users = await db.users.count_documents(user_query)
        total_students = await db.users.count_documents({**user_query, "role": "student"})
        total_faculty = await db.users.count_documents({**user_query, "role": "faculty"})
        total_docs = await db.documents.count_documents(doc_query)
        
        total_departments = await db.departments.count_documents({"active": True}) if caller_role == "admin" else 0
        total_clubs = await db.clubs.count_documents({"active": True}) if caller_role == "admin" else 0
        total_transport = await db.transport.count_documents({"active": True}) if caller_role == "admin" else 0
        
        # Optionally filter jobs if needed, but leaving as is for now
        recent_jobs_cursor = db.processing_jobs.find().sort("started_at", -1).limit(6)
        recent_jobs = [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in recent_jobs_cursor]
        
        return {
            "users": {
                "total": total_users,
                "students": total_students,
                "faculty": total_faculty
            },
            "documents": {
                "total": total_docs
            },
            "content": {
                "departments": total_departments,
                "clubs": total_clubs,
                "transport": total_transport
            },
            "recent_jobs": recent_jobs if caller_role == "admin" else []
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "users": {"total": 0, "students": 0, "faculty": 0},
            "documents": {"total": 0},
            "content": {"departments": 0, "clubs": 0, "transport": 0},
            "recent_jobs": []
        }

# ─── Documents Management ────────────────────────────

@router.get("/documents", dependencies=[Depends(get_current_staff_or_higher)])
async def get_all_documents(current_user: dict = Depends(get_current_user)):
    query = {}
    caller_role = current_user.get("role")
    if caller_role in ["faculty", "hod"]:
        query["department_id"] = current_user.get("department_id")
        
    cursor = db.documents.find(query).sort("created_at", -1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

@router.delete("/documents/{doc_id}", dependencies=[Depends(get_current_active_admin)])
async def delete_document(doc_id: str):
    from app.vector.qdrant_client import qdrant_client
    try:
        qdrant_client.delete_by_document_id(doc_id)
    except Exception as e:
        print(f"[Warning] Failed to remove vector points for {doc_id}: {e}")
        
    res = await db.documents.delete_one({"_id": ObjectId(doc_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.processing_jobs.delete_many({"document_id": doc_id})
    return {"message": "Document deleted successfully"}

# ─── Departments ────────────────────────────────────

@router.get("/departments", dependencies=[Depends(get_current_active_admin)])
async def get_departments():
    cursor = db.departments.find().sort("name", 1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

@router.post("/departments", dependencies=[Depends(get_current_active_admin)])
async def create_department(data: dict, background_tasks: BackgroundTasks):
    doc = {
        "code": data.get("code", "").upper(),
        "name": data.get("name", ""),
        "hod": data.get("hod", ""),
        "location": data.get("location", ""),
        "description": data.get("description", ""),
        "active": data.get("active", True),
        "created_at": datetime.utcnow()
    }
    res = await db.departments.insert_one(doc)
    background_tasks.add_task(sync_entity_to_qdrant, "department", str(res.inserted_id), doc)
    return {"id": str(res.inserted_id), "message": "Department created"}

@router.patch("/departments/{dept_id}", dependencies=[Depends(get_current_active_admin)])
async def update_department(dept_id: str, data: dict, background_tasks: BackgroundTasks):
    update_data = {k: v for k, v in data.items() if k != "id" and k != "_id"}
    update_data["updated_at"] = datetime.utcnow()
    res = await db.departments.update_one({"_id": ObjectId(dept_id)}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")
        
    updated_doc = await db.departments.find_one({"_id": ObjectId(dept_id)})
    if updated_doc:
        background_tasks.add_task(sync_entity_to_qdrant, "department", dept_id, updated_doc)
        
    return {"message": "Department updated"}

@router.delete("/departments/{dept_id}", dependencies=[Depends(get_current_active_admin)])
async def delete_department(dept_id: str, background_tasks: BackgroundTasks):
    res = await db.departments.delete_one({"_id": ObjectId(dept_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")
    background_tasks.add_task(delete_entity_from_qdrant, "department", dept_id)
    return {"message": "Department deleted"}

# ─── Clubs ──────────────────────────────────────────

@router.get("/clubs", dependencies=[Depends(get_current_active_admin)])
async def get_clubs():
    cursor = db.clubs.find().sort("name", 1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

@router.post("/clubs", dependencies=[Depends(get_current_active_admin)])
async def create_club(data: dict, background_tasks: BackgroundTasks):
    doc = {
        "name": data.get("name", ""),
        "category": data.get("category", "Technical"),
        "faculty_incharge": data.get("faculty_incharge", ""),
        "student_lead": data.get("student_lead", ""),
        "description": data.get("description", ""),
        "active": data.get("active", True),
        "created_at": datetime.utcnow()
    }
    res = await db.clubs.insert_one(doc)
    background_tasks.add_task(sync_entity_to_qdrant, "club", str(res.inserted_id), doc)
    return {"id": str(res.inserted_id), "message": "Club created"}

@router.patch("/clubs/{club_id}", dependencies=[Depends(get_current_active_admin)])
async def update_club(club_id: str, data: dict, background_tasks: BackgroundTasks):
    update_data = {k: v for k, v in data.items() if k != "id" and k != "_id"}
    update_data["updated_at"] = datetime.utcnow()
    res = await db.clubs.update_one({"_id": ObjectId(club_id)}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Club not found")
        
    updated_doc = await db.clubs.find_one({"_id": ObjectId(club_id)})
    if updated_doc:
        background_tasks.add_task(sync_entity_to_qdrant, "club", club_id, updated_doc)
        
    return {"message": "Club updated"}

@router.delete("/clubs/{club_id}", dependencies=[Depends(get_current_active_admin)])
async def delete_club(club_id: str, background_tasks: BackgroundTasks):
    res = await db.clubs.delete_one({"_id": ObjectId(club_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Club not found")
    background_tasks.add_task(delete_entity_from_qdrant, "club", club_id)
    return {"message": "Club deleted"}

# ─── Categories ─────────────────────────────────────

@router.get("/categories", dependencies=[Depends(get_current_active_admin)])
async def get_categories():
    cursor = db.categories.find().sort("name", 1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

@router.post("/categories", dependencies=[Depends(get_current_active_admin)])
async def create_category(data: dict):
    doc = {
        "name": data.get("name", ""),
        "slug": data.get("slug", "").lower().replace(" ", "-"),
        "description": data.get("description", ""),
        "icon": data.get("icon", "Folder"),
        "active": data.get("active", True),
        "created_at": datetime.utcnow()
    }
    res = await db.categories.insert_one(doc)
    return {"id": str(res.inserted_id), "message": "Category created"}

@router.patch("/categories/{cat_id}", dependencies=[Depends(get_current_active_admin)])
async def update_category(cat_id: str, data: dict):
    update_data = {k: v for k, v in data.items() if k != "id" and k != "_id"}
    update_data["updated_at"] = datetime.utcnow()
    res = await db.categories.update_one({"_id": ObjectId(cat_id)}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category updated"}

@router.delete("/categories/{cat_id}", dependencies=[Depends(get_current_active_admin)])
async def delete_category(cat_id: str):
    res = await db.categories.delete_one({"_id": ObjectId(cat_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# ─── Transport ──────────────────────────────────────

@router.get("/transport", dependencies=[Depends(get_current_active_admin)])
async def get_transport_routes():
    cursor = db.transport.find().sort("route_number", 1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

@router.post("/transport", dependencies=[Depends(get_current_active_admin)])
async def create_transport_route(data: dict, background_tasks: BackgroundTasks):
    doc = {
        "route_number": data.get("route_number", ""),
        "destination": data.get("destination", ""),
        "driver_name": data.get("driver_name", ""),
        "driver_contact": data.get("driver_contact", ""),
        "departure_time": data.get("departure_time", "07:30 AM"),
        "stops": data.get("stops", []),
        "active": data.get("active", True),
        "created_at": datetime.utcnow()
    }
    res = await db.transport.insert_one(doc)
    background_tasks.add_task(sync_entity_to_qdrant, "transport", str(res.inserted_id), doc)
    return {"id": str(res.inserted_id), "message": "Transport route created"}

@router.patch("/transport/{route_id}", dependencies=[Depends(get_current_active_admin)])
async def update_transport_route(route_id: str, data: dict, background_tasks: BackgroundTasks):
    update_data = {k: v for k, v in data.items() if k != "id" and k != "_id"}
    update_data["updated_at"] = datetime.utcnow()
    res = await db.transport.update_one({"_id": ObjectId(route_id)}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
        
    updated_doc = await db.transport.find_one({"_id": ObjectId(route_id)})
    if updated_doc:
        background_tasks.add_task(sync_entity_to_qdrant, "transport", route_id, updated_doc)
        
    return {"message": "Transport route updated"}

@router.delete("/transport/{route_id}", dependencies=[Depends(get_current_active_admin)])
async def delete_transport_route(route_id: str, background_tasks: BackgroundTasks):
    res = await db.transport.delete_one({"_id": ObjectId(route_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    background_tasks.add_task(delete_entity_from_qdrant, "transport", route_id)
    return {"message": "Transport route deleted"}

# ─── Campus Data ────────────────────────────────────

@router.get("/campus-data", dependencies=[Depends(get_current_active_admin)])
async def get_campus_data():
    cursor = db.campus_data.find().sort("title", 1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

@router.post("/campus-data", dependencies=[Depends(get_current_active_admin)])
async def create_campus_data(data: dict, background_tasks: BackgroundTasks):
    doc = {
        "title": data.get("title", ""),
        "category": data.get("category", "General"),
        "content": data.get("content", ""),
        "tags": data.get("tags", []),
        "active": data.get("active", True),
        "created_at": datetime.utcnow()
    }
    res = await db.campus_data.insert_one(doc)
    background_tasks.add_task(sync_entity_to_qdrant, "campus_data", str(res.inserted_id), doc)
    return {"id": str(res.inserted_id), "message": "Campus data added"}

@router.patch("/campus-data/{item_id}", dependencies=[Depends(get_current_active_admin)])
async def update_campus_data(item_id: str, data: dict, background_tasks: BackgroundTasks):
    update_data = {k: v for k, v in data.items() if k != "id" and k != "_id"}
    update_data["updated_at"] = datetime.utcnow()
    res = await db.campus_data.update_one({"_id": ObjectId(item_id)}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
        
    updated_doc = await db.campus_data.find_one({"_id": ObjectId(item_id)})
    if updated_doc:
        background_tasks.add_task(sync_entity_to_qdrant, "campus_data", item_id, updated_doc)
        
    return {"message": "Campus data updated"}

@router.delete("/campus-data/{item_id}", dependencies=[Depends(get_current_active_admin)])
async def delete_campus_data(item_id: str, background_tasks: BackgroundTasks):
    res = await db.campus_data.delete_one({"_id": ObjectId(item_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    background_tasks.add_task(delete_entity_from_qdrant, "campus_data", item_id)
    return {"message": "Campus data deleted"}

# ─── Processing Jobs ────────────────────────────────

@router.get("/jobs", dependencies=[Depends(get_current_active_admin)])
async def get_jobs():
    cursor = db.processing_jobs.find().sort("started_at", -1).limit(50)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} async for doc in cursor]

