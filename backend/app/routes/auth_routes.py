import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from database.mongo import db_manager
from services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class UserRegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "student" # "admin" or "student"
    student_id: Optional[str] = None

class UserLoginRequest(BaseModel):
    username: str
    password: str

class GuestLoginRequest(BaseModel):
    guest_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    student_id: Optional[str] = None

@router.post("/register", response_model=TokenResponse)
def register(req: UserRegisterRequest):
    if req.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration of Admin accounts is disabled. Admin access can only be granted by an existing Administrator."
        )

    if db_manager.get_user_by_username(req.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered."
        )

    student_id = req.student_id or (f"STU-{uuid.uuid4().hex[:6].upper()}" if req.role == "student" else None)
    
    if req.role == "student" and db_manager.get_user_by_student_id(student_id):
        student_id = f"STU-{uuid.uuid4().hex[:6].upper()}"

    user_data = {
        "username": req.username,
        "email": req.username,
        "password_hash": hash_password(req.password),
        "role": req.role,
        "student_id": student_id,
        "created_by": "self-registration"
    }
    db_manager.create_user(user_data)

    token = create_access_token({
        "sub": req.username,
        "role": req.role,
        "student_id": student_id
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": req.username,
        "role": req.role,
        "student_id": student_id
    }

@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest):
    # Allow login by username OR student ID
    user = db_manager.get_user_by_username(req.username)
    if not user:
        user = db_manager.get_user_by_student_id(req.username)

    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    student_id = user.get("student_id", user["username"])
    role = user.get("role", "student")

    token = create_access_token({
        "sub": user["username"],
        "role": role,
        "student_id": student_id
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user["username"],
        "role": role,
        "student_id": student_id
    }

@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    token = current_user.get("token")
    if token:
        db_manager.revoke_jwt_token(token)
    return {"message": "Logged out successfully and JWT session revoked."}

@router.post("/guest-login", response_model=TokenResponse)
def guest_login(req: GuestLoginRequest):
    guest_id = f"guest_{uuid.uuid4().hex[:8]}"
    username = req.guest_name or f"Guest-{guest_id[:5]}"
    
    token = create_access_token({
        "sub": username,
        "role": "guest",
        "student_id": None
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": username,
        "role": "guest",
        "student_id": None
    }

@router.get("/me")
def get_profile(current_user: dict = Depends(get_current_user)):
    return current_user
