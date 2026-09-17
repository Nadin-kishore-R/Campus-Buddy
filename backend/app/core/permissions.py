from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from app.core.security import decode_token
from app.db.mongodb import db
from bson import ObjectId

# Used for endpoints that REQUIRE authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Used for endpoints that OPTIONALLY accept authentication (e.g. guest chat)
# auto_error=False means missing/invalid token returns None instead of 401
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
        
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
        
    if not user.get("active", True):
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user

async def get_optional_user(token: Optional[str] = Depends(oauth2_scheme_optional)) -> Optional[dict]:
    """
    Returns the current user if a valid token is provided, otherwise returns None.
    Does NOT raise 401 — allows unauthenticated/guest requests to pass through.
    """
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload is None:
            return None
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            return None
        if not user.get("active", True):
            return None
        return user
    except Exception:
        return None

async def get_current_active_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges. Admin required.")
    return current_user

async def get_current_admin_or_hod(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["admin", "hod"]:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges. Admin or HOD required.")
    return current_user

async def get_current_staff_or_higher(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["admin", "hod", "faculty"]:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges. Staff or higher required.")
    return current_user

async def get_current_active_faculty(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["admin", "hod", "faculty"]:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")
    return current_user

