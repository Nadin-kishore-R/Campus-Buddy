from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
from app.db.mongodb import db
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token, decode_token
)
from app.core.permissions import get_current_user, get_optional_user
from app.config import settings

router = APIRouter()

# ─── Request / Response models ────────────────────────────────
class LoginRequest(BaseModel):
    identifier: str   # email OR student_id
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    identifier: str   # email or student_id

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# ─── Helpers ──────────────────────────────────────────────────
async def find_user_by_identifier(identifier: str):
    """Find user by email or student_id."""
    user = await db.users.find_one({"email": identifier})
    if not user:
        user = await db.users.find_one({"student_id": identifier})
    return user

def build_token_response(user: dict) -> dict:
    user_id = str(user["_id"])
    access_token  = create_access_token(subject=user_id)
    refresh_token = create_refresh_token(subject=user_id)
    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "role":          user.get("role", "student"),
        "name":          user.get("name", ""),
        "email":         user.get("email", ""),
        "student_id":    user.get("student_id", ""),
    }

# ─── Endpoints ────────────────────────────────────────────────

@router.post("/login")
async def login(request: LoginRequest):
    user = await find_user_by_identifier(request.identifier)
    if not user or not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials. Check your Student ID / email and password."
        )
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account is disabled. Contact the administrator.")

    # Store refresh token for revocation tracking
    await db.sessions.insert_one({
        "user_id":       str(user["_id"]),
        "refresh_token": create_refresh_token(subject=str(user["_id"])),
        "created_at":    datetime.utcnow(),
    })

    return build_token_response(user)


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Revoke all sessions for the current user."""
    await db.sessions.delete_many({"user_id": str(current_user["_id"])})
    return {"message": "Logged out successfully."}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_data = {k: v for k, v in current_user.items() if k not in ("password_hash",)}
    user_data["_id"] = str(user_data["_id"])
    return user_data


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    if not verify_password(body.current_password, current_user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    new_hash = get_password_hash(body.new_password)
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.utcnow()}}
    )
    # Revoke all sessions so other devices are logged out
    await db.sessions.delete_many({"user_id": str(current_user["_id"])})
    return {"message": "Password changed successfully. Please log in again."}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    """
    Generates a password reset token. In production wire this to an email service.
    For now the token is returned directly (admin can relay it to the user).
    """
    user = await find_user_by_identifier(body.identifier)
    if not user:
        # Do NOT reveal whether the user exists
        return {"message": "If that account exists, a reset link has been sent to the registered email."}

    reset_token = create_access_token(
        subject=str(user["_id"]),
        expires_delta=timedelta(minutes=30)
    )
    # Store in DB so it can be single-use
    await db.password_reset_tokens.insert_one({
        "user_id":    str(user["_id"]),
        "token":      reset_token,
        "used":       False,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=30),
    })

    # TODO: send email with reset_token
    # For development, return the token directly
    return {
        "message": "Password reset token generated. Share this with the user.",
        "reset_token": reset_token,   # remove in production
        "expires_in_minutes": 30,
    }


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    payload = decode_token(body.token)
    if not payload:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    record = await db.password_reset_tokens.find_one({"token": body.token, "used": False})
    if not record:
        raise HTTPException(status_code=400, detail="Token already used or not found.")

    if datetime.utcnow() > record["expires_at"]:
        raise HTTPException(status_code=400, detail="Reset token has expired.")

    user_id = payload.get("sub")
    new_hash = get_password_hash(body.new_password)
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.utcnow()}}
    )
    await db.password_reset_tokens.update_one(
        {"token": body.token},
        {"$set": {"used": True}}
    )
    await db.sessions.delete_many({"user_id": user_id})
    return {"message": "Password reset successfully. You can now log in."}
