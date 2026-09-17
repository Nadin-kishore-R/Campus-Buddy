import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
import config

try:
    from pymongo import MongoClient
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False

class MongoManager:
    """Manages MongoDB connections for Users, Document Metadata, and Student Chat Histories.
    Includes an automatic local JSON storage fallback for local dev when MongoDB server is offline.
    """

    def __init__(self):
        self.use_mongo = False
        self.db = None
        self.fallback_file = config.STORAGE_DIR / "local_db.json"

        if PYMONGO_AVAILABLE:
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    self.client = MongoClient(config.MONGO_URI, serverSelectionTimeoutMS=3000)
                    # Check connection
                    self.client.admin.command('ping')
                    self.db = self.client[config.MONGO_DB_NAME]
                    self.use_mongo = True
                    print(f"[MongoManager] Connected successfully to MongoDB at '{config.MONGO_URI}' (DB: {config.MONGO_DB_NAME})")
                    break
                except Exception as e:
                    print(f"[MongoManager] MongoDB connection attempt {attempt + 1}/{max_retries} failed ({e}).")
                    if attempt < max_retries - 1:
                        time.sleep(2)
            
            if not self.use_mongo:
                print("[MongoManager] All MongoDB connection attempts failed. Falling back to local JSON persistence.")
        else:
            print("[MongoManager] pymongo package not installed. Using local JSON fallback.")

        if not self.use_mongo:
            self._init_fallback_db()

        # Seed initial Principal account
        self.seed_initial_users()

    def _init_fallback_db(self):
        if not self.fallback_file.exists():
            data = {
                "users": [],
                "documents": [],
                "chat_histories": [],
                "jwt_tokens": []
            }
            self.fallback_file.write_text(json.dumps(data, indent=2))

    def _read_fallback(self) -> Dict[str, List[Dict[str, Any]]]:
        try:
            if self.fallback_file.exists():
                data = json.loads(self.fallback_file.read_text())
                if "jwt_tokens" not in data:
                    data["jwt_tokens"] = []
                return data
        except Exception:
            pass
        return {"users": [], "documents": [], "chat_histories": [], "jwt_tokens": []}

    def _write_fallback(self, data: Dict[str, List[Dict[str, Any]]]):
        self.fallback_file.write_text(json.dumps(data, indent=2))

    def seed_initial_users(self):
        """Seeds the default Principal Super Admin account if not present."""
        principal_email = "kprprinciple@kpriet.ac.in"
        existing = self.get_user_by_username(principal_email)
        if not existing:
            # We import hash_password lazily to prevent circular imports
            import hashlib
            salted = f"123456{config.SECRET_KEY}"
            pass_hash = hashlib.sha256(salted.encode('utf-8')).hexdigest()
            
            principal_user = {
                "username": principal_email,
                "email": principal_email,
                "password_hash": pass_hash,
                "role": "admin",
                "full_name": "KPR Principal",
                "student_id": None,
                "created_by": "system",
                "created_at": time.time()
            }
            self.create_user(principal_user)
            print(f"[MongoManager] Seeded default Principal Super Admin account ({principal_email})")

    # --- USER OPERATIONS ---
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        if not username:
            return None
        if self.use_mongo:
            return self.db.users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
        else:
            data = self._read_fallback()
            for user in data["users"]:
                if user.get("username", "").lower() == username.lower() or user.get("email", "").lower() == username.lower():
                    return user
            return None

    def get_user_by_student_id(self, student_id: str) -> Optional[Dict[str, Any]]:
        if not student_id:
            return None
        if self.use_mongo:
            return self.db.users.find_one({"student_id": {"$regex": f"^{student_id}$", "$options": "i"}})
        else:
            data = self._read_fallback()
            for user in data["users"]:
                if user.get("student_id") and user["student_id"].lower() == student_id.lower():
                    return user
            return None

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        if "created_at" not in user_data:
            user_data["created_at"] = time.time()
        if self.use_mongo:
            self.db.users.insert_one(user_data)
            return user_data
        else:
            data = self._read_fallback()
            data["users"].append(user_data)
            self._write_fallback(data)
            return user_data

    def get_all_users(self) -> List[Dict[str, Any]]:
        """Returns all registered users with sensitive password hashes removed."""
        if self.use_mongo:
            users = list(self.db.users.find({}, {"password_hash": 0, "_id": 0}))
            return users
        else:
            data = self._read_fallback()
            clean_users = []
            for u in data["users"]:
                user_copy = {k: v for k, v in u.items() if k != "password_hash"}
                clean_users.append(user_copy)
            return clean_users

    def delete_user(self, username: str) -> bool:
        if self.use_mongo:
            res = self.db.users.delete_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
            return res.deleted_count > 0
        else:
            data = self._read_fallback()
            initial_count = len(data["users"])
            data["users"] = [u for u in data["users"] if u.get("username", "").lower() != username.lower()]
            self._write_fallback(data)
            return len(data["users"]) < initial_count

    # --- JWT TOKEN & SESSION OPERATIONS IN MONGODB ---
    def save_jwt_token(self, token: str, user_data: Dict[str, Any], expires_in_minutes: int = 1440):
        now = time.time()
        token_doc = {
            "token": token,
            "username": user_data.get("username"),
            "role": user_data.get("role", "student"),
            "student_id": user_data.get("student_id"),
            "created_at": now,
            "expires_at": now + (expires_in_minutes * 60),
            "is_active": True
        }
        if self.use_mongo:
            self.db.jwt_tokens.update_one(
                {"token": token},
                {"$set": token_doc},
                upsert=True
            )
        else:
            data = self._read_fallback()
            data["jwt_tokens"] = [t for t in data["jwt_tokens"] if t.get("token") != token]
            data["jwt_tokens"].append(token_doc)
            self._write_fallback(data)

    def is_token_active(self, token: str) -> bool:
        now = time.time()
        if self.use_mongo:
            doc = self.db.jwt_tokens.find_one({"token": token, "is_active": True})
            if doc and doc.get("expires_at", 0) > now:
                return True
            return False
        else:
            data = self._read_fallback()
            for t in data.get("jwt_tokens", []):
                if t.get("token") == token and t.get("is_active", True) and t.get("expires_at", 0) > now:
                    return True
            return False

    def revoke_jwt_token(self, token: str) -> bool:
        if self.use_mongo:
            res = self.db.jwt_tokens.update_one({"token": token}, {"$set": {"is_active": False}})
            return res.modified_count > 0
        else:
            data = self._read_fallback()
            found = False
            for t in data.get("jwt_tokens", []):
                if t.get("token") == token:
                    t["is_active"] = False
                    found = True
            if found:
                self._write_fallback(data)
            return found

    # --- DOCUMENT METADATA OPERATIONS ---
    def save_document_metadata(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        doc_data["uploaded_at"] = time.time()
        if self.use_mongo:
            self.db.documents.update_one(
                {"doc_id": doc_data["doc_id"]},
                {"$set": doc_data},
                upsert=True
            )
            return doc_data
        else:
            data = self._read_fallback()
            data["documents"] = [d for d in data["documents"] if d.get("doc_id") != doc_data["doc_id"]]
            data["documents"].append(doc_data)
            self._write_fallback(data)
            return doc_data

    def get_documents(self, category: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.use_mongo:
            query = {}
            if category and category.lower() != "all":
                query["category"] = category
            if search:
                query["filename"] = {"$regex": search, "$options": "i"}
            docs = list(self.db.documents.find(query, {"_id": 0}))
            return docs
        else:
            data = self._read_fallback()
            docs = data["documents"]
            if category and category.lower() != "all":
                docs = [d for d in docs if d.get("category", "").lower() == category.lower()]
            if search:
                docs = [d for d in docs if search.lower() in d.get("filename", "").lower()]
            return docs

    def delete_document_metadata(self, doc_id: str) -> bool:
        if self.use_mongo:
            res = self.db.documents.delete_one({"doc_id": doc_id})
            return res.deleted_count > 0
        else:
            data = self._read_fallback()
            initial_count = len(data["documents"])
            data["documents"] = [d for d in data["documents"] if d.get("doc_id") != doc_id]
            self._write_fallback(data)
            return len(data["documents"]) < initial_count

    # --- STUDENT CHAT HISTORY OPERATIONS ---
    def get_student_sessions(self, student_id: str) -> List[Dict[str, Any]]:
        if self.use_mongo:
            sessions = list(self.db.chat_histories.find({"student_id": student_id}, {"_id": 0}).sort("updated_at", -1))
            return sessions
        else:
            data = self._read_fallback()
            sessions = [s for s in data["chat_histories"] if s.get("student_id") == student_id]
            sessions.sort(key=lambda x: x.get("updated_at", 0), reverse=True)
            return sessions

    def get_chat_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        if self.use_mongo:
            return self.db.chat_histories.find_one({"session_id": session_id}, {"_id": 0})
        else:
            data = self._read_fallback()
            for s in data["chat_histories"]:
                if s.get("session_id") == session_id:
                    return s
            return None

    def save_chat_turn(self, session_id: str, student_id: str, title: str, user_query: str, bot_response: str, sources: List[Dict[str, Any]]) -> Dict[str, Any]:
        now = time.time()
        user_msg = {"role": "user", "content": user_query, "timestamp": now}
        bot_msg = {"role": "assistant", "content": bot_response, "sources": sources, "timestamp": now}

        if self.use_mongo:
            session = self.db.chat_histories.find_one({"session_id": session_id})
            if session:
                self.db.chat_histories.update_one(
                    {"session_id": session_id},
                    {
                        "$push": {"messages": {"$each": [user_msg, bot_msg]}},
                        "$set": {"updated_at": now, "title": title}
                    }
                )
            else:
                session_doc = {
                    "session_id": session_id,
                    "student_id": student_id,
                    "title": title,
                    "messages": [user_msg, bot_msg],
                    "created_at": now,
                    "updated_at": now
                }
                self.db.chat_histories.insert_one(session_doc)
            return self.get_chat_session(session_id)
        else:
            data = self._read_fallback()
            found = False
            for s in data["chat_histories"]:
                if s.get("session_id") == session_id:
                    s["messages"].extend([user_msg, bot_msg])
                    s["updated_at"] = now
                    s["title"] = title
                    found = True
                    break
            if not found:
                session_doc = {
                    "session_id": session_id,
                    "student_id": student_id,
                    "title": title,
                    "messages": [user_msg, bot_msg],
                    "created_at": now,
                    "updated_at": now
                }
                data["chat_histories"].append(session_doc)
            self._write_fallback(data)
            return self.get_chat_session(session_id)

    def delete_chat_session(self, session_id: str) -> bool:
        if self.use_mongo:
            res = self.db.chat_histories.delete_one({"session_id": session_id})
            return res.deleted_count > 0
        else:
            data = self._read_fallback()
            initial_count = len(data["chat_histories"])
            data["chat_histories"] = [s for s in data["chat_histories"] if s.get("session_id") != session_id]
            self._write_fallback(data)
            return len(data["chat_histories"]) < initial_count

# Singleton instance
db_manager = MongoManager()
