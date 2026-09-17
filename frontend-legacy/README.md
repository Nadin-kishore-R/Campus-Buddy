# College RAG Chatbot - Frontend & Backend Parameter Binding Reference Guide

This document contains full technical specifications and parameter bindings connecting the **React Frontend** interface with the **FastAPI Backend** RAG service.

---

## Technical Stack Overview

- **Frontend**: React 18, Vite, Lucide Icons, Glassmorphism Vanilla CSS Design System.
- **Backend**: FastAPI (Python 3.10+), MinIO Object Storage, MongoDB Persistence, Qdrant Vector Store, HuggingFace Embeddings (`BAAI/bge-base-en-v1.5`), Local Ollama LLM (`qwen2.5:7b`).

---

## Backend API Endpoints & Frontend Parameter Bindings

### 1. Authentication APIs (`/api/auth`)

#### `POST /api/auth/register`
Creates a new user account (Admin or Student).
- **Request Headers**: `Content-Type: application/json`
- **Request Body Payload**:
  ```json
  {
    "username": "student_john",
    "password": "Password123!",
    "role": "student",
    "student_id": "STU-88492"
  }
  ```
- **Response Format**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "username": "student_john",
    "role": "student",
    "student_id": "STU-88492"
  }
  ```

#### `POST /api/auth/login`
Authenticates a user via Username or Student ID.
- **Request Body Payload**:
  ```json
  {
    "username": "STU-88492",
    "password": "Password123!"
  }
  ```
- **Response**: JWT Bearer token + role + student_id.

#### `POST /api/auth/guest-login`
Generates a temporary session token for non-registered guest users.
- **Request Body Payload**:
  ```json
  {
    "guest_name": "Visitor-99"
  }
  ```

#### `GET /api/auth/me`
Fetches the currently authenticated profile.
- **Request Headers**: `Authorization: Bearer <access_token>`

---

### 2. Admin Document & Vector Store Management (`/api/admin`)

> [!IMPORTANT]
> Requires `Authorization: Bearer <token>` with `role: "admin"`.

#### `POST /api/admin/upload-pdf`
Uploads a PDF to MinIO, writes metadata into MongoDB, chunks the text, and dynamically indexes vector embeddings in Qdrant Vector Store.
- **Content-Type**: `multipart/form-data`
- **Form Parameters**:
  - `file`: PDF file blob (`application/pdf`)
  - `category`: Category string (`"Academic"`, `"Administrative"`, `"Placement"`, `"Admissions"`, `"Examination"`, `"General"`)
- **Response Payload**:
  ```json
  {
    "message": "Document successfully uploaded and indexed into Vector DB.",
    "document": {
      "doc_id": "doc_a1b2c3d4",
      "filename": "syllabus_2026.pdf",
      "minio_object_name": "doc_a1b2c3d4_syllabus_2026.pdf",
      "minio_uri": "minio://college-documents/doc_a1b2c3d4_syllabus_2026.pdf",
      "category": "Academic",
      "file_size": 248902,
      "uploaded_by": "admin",
      "chunk_count": 14,
      "vector_count": 14
    }
  }
  ```

#### `GET /api/admin/documents`
Lists uploaded PDF documents with search keyword and category filtration.
- **Query Parameters**:
  - `category` *(optional)*: `"Academic"`, `"Placement"`, etc.
  - `search` *(optional)*: Keyword string for matching filename.
- **Response**:
  ```json
  {
    "count": 2,
    "documents": [
      {
        "doc_id": "doc_a1b2c3d4",
        "filename": "syllabus_2026.pdf",
        "category": "Academic",
        "file_size": 248902,
        "chunk_count": 14
      }
    ]
  }
  ```

#### `DELETE /api/admin/documents/{doc_id}`
Dynamically deletes document from MinIO object storage, MongoDB metadata collection, and removes vector points from Qdrant Vector Store.
- **Path Parameter**: `doc_id` (e.g. `doc_a1b2c3d4`)
- **Response**:
  ```json
  {
    "message": "Document 'syllabus_2026.pdf' (ID: doc_a1b2c3d4) dynamically removed from MinIO, MongoDB, and Vector DB.",
    "deleted_doc_id": "doc_a1b2c3d4"
  }
  ```

#### `POST /api/admin/reindex`
Forces full re-indexing of all MinIO files into Qdrant Vector DB.

---

### 3. Student & Guest RAG Chat APIs (`/api/chat`)

#### `POST /api/chat/query`
Executes RAG context retrieval and Ollama LLM inference.
For Student login: Retrieves past conversation turn history from MongoDB, incorporates it into the prompt context, and appends the new exchange to MongoDB history.
- **Request Body Payload**:
  ```json
  {
    "session_id": "session_99182a",
    "question": "What are the eligibility criteria for campus placement?",
    "category": "Placement"
  }
  ```
- **Response Payload**:
  ```json
  {
    "session_id": "session_99182a",
    "student_id": "STU-88492",
    "question": "What are the eligibility criteria for campus placement?",
    "answer": "Based on the College Placement Policy document, students must maintain a minimum CGPA of 6.5 with no active arrears...",
    "sources": [
      {
        "score": 0.8845,
        "text": "Placement Criteria: Minimum 6.5 CGPA required for Phase 1 campus drives...",
        "filename": "placement_policy_2026.pdf",
        "category": "Placement"
      }
    ]
  }
  ```

#### `GET /api/chat/history`
Returns all previous conversation sessions for the authenticated student.
- **Response Payload**:
  ```json
  {
    "sessions": [
      {
        "session_id": "session_99182a",
        "student_id": "STU-88492",
        "title": "What are the eligibility criteria...",
        "updated_at": 1770743200
      }
    ]
  }
  ```

#### `GET /api/chat/history/{session_id}`
Returns all messages for a given chat session.

#### `DELETE /api/chat/history/{session_id}`
Deletes a specific student chat history session.

---

## Local Development Execution Instructions

### 1. Start FastAPI Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
pip install -r requirements.txt

# Start backend on http://localhost:8000
python app/main.py
```

### 2. Start React Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000 with proxy to http://localhost:8000
```
