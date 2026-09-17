from pymongo import AsyncMongoClient
from app.config import settings


class Database:
    client: AsyncMongoClient | None = None
    db = None

    # Collections
    users = None
    sessions = None
    documents = None
    departments = None
    clubs = None
    categories = None
    permissions = None
    conversations = None
    messages = None
    guest_sessions = None
    processing_jobs = None
    audit_logs = None
    settings = None
    password_reset_tokens = None
    transport = None
    campus_data = None
    events = None


db = Database()


async def connect_to_mongo():
    db.client = AsyncMongoClient(settings.MONGO_URI)
    db.db = db.client[settings.MONGO_DB_NAME]

    # Initialize collection references
    db.users = db.db.users
    db.sessions = db.db.sessions
    db.documents = db.db.documents
    db.departments = db.db.departments
    db.clubs = db.db.clubs
    db.categories = db.db.categories
    db.permissions = db.db.permissions
    db.conversations = db.db.conversations
    db.messages = db.db.messages
    db.guest_sessions = db.db.guest_sessions
    db.processing_jobs = db.db.processing_jobs
    db.audit_logs = db.db.audit_logs
    db.settings = db.db.settings
    db.password_reset_tokens = db.db.password_reset_tokens
    db.transport = db.db.transport
    db.campus_data = db.db.campus_data
    db.events = db.db.events

    # Create indexes
    await db.guest_sessions.create_index(
        "expires_at",
        expireAfterSeconds=0
    )

    await db.users.create_index(
        "email",
        unique=True
    )

    await db.users.create_index(
        "student_id",
        sparse=True
    )

    await db.password_reset_tokens.create_index(
        "expires_at",
        expireAfterSeconds=0
    )

    print("Connected to MongoDB.")


async def close_mongo_connection():
    if db.client:
        await db.client.close()
        db.client = None
        print("Closed MongoDB connection.")