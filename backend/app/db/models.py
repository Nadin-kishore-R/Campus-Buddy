from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler=None):
        if not isinstance(v, str):
            raise ValueError("Invalid ObjectId")
        return v

class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: EmailStr
    password_hash: str
    name: str
    role: str = "student" # student, faculty, admin
    student_id: Optional[str] = None
    department_id: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    club_ids: List[str] = []
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DocumentMetadata(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    description: Optional[str] = None
    filename: str
    object_key: str
    content_type: str
    file_size: int
    departments: List[str] = []
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    club_id: Optional[str] = None
    document_type: str
    academic_year: Optional[str] = None
    semester: Optional[int] = None
    audience: str = "all"
    access_level: str = "public"
    owner: Optional[str] = None
    uploaded_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "uploaded"
    processing_error: Optional[str] = None
    version: int = 1
    effective_from: Optional[datetime] = None
    effective_until: Optional[datetime] = None
    active: bool = True
    supersedes: Optional[str] = None
    custom_metadata: dict = {}

class ProcessingJob(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    document_id: str
    status: str = "uploaded"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    chunks_created: int = 0
    vectors_stored: int = 0
    retry_count: int = 0

class Department(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    code: str
    description: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Club(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    description: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Category(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    parent_id: Optional[str] = None
    level: int = 0
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AuditLog(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: dict = {}
    ip_address: Optional[str] = None

class Conversation(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    conversation_id: str
    user_id: str
    title: str = "New Conversation"
    status: str = "active"
    summary: Optional[str] = None
    message_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_at: datetime = Field(default_factory=datetime.utcnow)

class Message(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    conversation_id: str
    role: str
    content: str
    sources: List[dict] = []
    metadata: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GuestSession(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    guest_session_id: str
    messages: List[dict] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    status: str = "active"
