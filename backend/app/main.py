from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1 import api_router
from app.db.mongodb import connect_to_mongo, close_mongo_connection

app = FastAPI(title="Campus AI Assistant API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()
    await seed_default_admin()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

async def seed_default_admin():
    """
    Creates the principal admin account on first boot.
    Email   : principal@kpriet.ac.in
    Password: 123456
    This runs every startup but is idempotent — it only inserts if not present.
    """
    from app.db.mongodb import db
    from app.core.security import get_password_hash
    from datetime import datetime

    ADMIN_EMAIL    = "principal@kpriet.ac.in"
    ADMIN_PASSWORD = "123456"
    ADMIN_NAME     = "Principal"

    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "email":         ADMIN_EMAIL,
            "password_hash": get_password_hash(ADMIN_PASSWORD),
            "name":          ADMIN_NAME,
            "role":          "admin",
            "student_id":    None,
            "department_id": None,
            "year":          None,
            "section":       None,
            "club_ids":      [],
            "active":        True,
            "created_at":    datetime.utcnow(),
            "updated_at":    datetime.utcnow(),
        })
        print(f"[Seed] Admin account created: {ADMIN_EMAIL}")
    else:
        print(f"[Seed] Admin account already exists: {ADMIN_EMAIL}")

app.include_router(api_router, prefix="/api/v1")

