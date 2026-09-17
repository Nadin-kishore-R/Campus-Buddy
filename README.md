# CampusAI — KPRIET Campus Assistant

A full-stack **Retrieval-Augmented Generation (RAG)** chatbot system for campus information. It ships with separate **Student/Guest** and **Admin** web portals, **JWT-based authentication** with **role-based access control (RBAC)**, asynchronous document ingestion, and a **100% automated, zero-touch Docker deployment pipeline** with persistent local LLM and embedding model management.

---

## 📑 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Backend Deep Dive](#backend-deep-dive)
   - 3.1 [Application Entry & Lifespan](#31-application-entry--lifespan)
   - 3.2 [RAG Pipeline](#32-rag-pipeline)
   - 3.3 [Document Processing](#33-document-processing)
   - 3.4 [Vector Database (Qdrant)](#34-vector-database-qdrant)
   - 3.5 [MongoDB (Application Database)](#35-mongodb-application-database)
   - 3.6 [MinIO (Object Storage)](#36-minio-object-storage)
   - 3.7 [Embeddings & LLM](#37-embeddings--llm)
   - 3.8 [Authentication & RBAC](#38-authentication--rbac)
   - 3.9 [Async Document Ingestion Jobs](#39-async-document-ingestion-jobs)
   - 3.10 [API Surface](#310-api-surface)
4. [Frontend Architecture](#frontend-architecture)
5. [System Workflows](#system-workflows)
   - 5.1 [Authentication Flow](#51-authentication-flow)
   - 5.2 [Guest Session Flow](#52-guest-session-flow)
   - 5.3 [RAG Query Flow (Chat)](#53-rag-query-flow-chat)
   - 5.4 [Document Upload & Ingestion Flow](#54-document-upload--ingestion-flow)
   - 5.5 [Admin User Provisioning Flow](#55-admin-user-provisioning-flow)
   - 5.6 [Password Reset Flow](#56-password-reset-flow)
   - 5.7 [Conversation Memory & Auto-Summary Flow](#57-conversation-memory--auto-summary-flow)
   - 5.8 [Docker Bootstrap & Model Pull Flow](#58-docker-bootstrap--model-pull-flow)
6. [Docker & Deployment Guide](#docker--deployment-guide)
7. [Service Ports & Endpoints](#service-ports--endpoints)
8. [How to Add the First Admin](#how-to-add-the-first-admin)
9. [How Students Get Access](#how-students-get-access)
10. [Environment Variables](#environment-variables)
11. [Troubleshooting & FAQ](#troubleshooting--faq)
12. [Known Caveats](#known-caveats)

---

## Architecture Overview

```
                                   ┌──────────────────────────┐
                                   │      Host (Browser)      │
                                   └─────────────┬────────────┘
                                                 │
                  ┌──────────────────────────────┴──────────────────────────────┐
                  ▼ (Port 5173)                                                 ▼ (Port 5174)
    ┌───────────────────────────┐                                 ┌───────────────────────────┐
    │   frontend-user (Nginx)   │                                 │   frontend-admin (Nginx)  │
    │ React + Vite + Tailwind   │                                 │ React + Vite + Tailwind   │
    └─────────────┬─────────────┘                                 └─────────────┬─────────────┘
                  │                                                             │
                  └──────────────────────────────┬──────────────────────────────┘
                                                 │ proxy_pass /api/ (Dynamic DNS)
                                                 ▼ (Port 8000)
                                  ┌─────────────────────────────┐
                                  │       FastAPI Backend       │
                                  │  (app/api/v1 — async routes)│
                                  └──────────────┬──────────────┘
                                                 │
          ┌───────────────────────┬──────────────┼───────────────────────┬───────────────────────┐
          ▼                       ▼              ▼                       ▼                       ▼
 ┌─────────────────┐    ┌─────────────────┐ ┌─────────┐    ┌───────────────────┐    ┌─────────────────┐
 │     MongoDB     │    │      MinIO      │ │ Qdrant  │    │      Ollama       │    │  Hugging Face   │
 │  (Port 27017)   │    │  (Port 9000)    │ │(Pt 6333)│    │   (Port 11434)    │    │  (Cache Volume) │
 │ [mongodb_data]  │    │  [minio_data]   │ │[qdrant] │    │   [ollama_data]   │    │   [hf_cache]    │
 └─────────────────┘    └────────┬────────┘ └─────────┘    └─────────┬─────────┘    └─────────────────┘
                                 │                                   │
                                 ▼                                   ▼
                        ┌─────────────────┐                 ┌─────────────────┐
                        │   createbuckets  │                 │   ollama-init   │
                        │  (MinIO Init)    │                 │ (Model Puller)  │
                        └─────────────────┘                 └─────────────────┘
```

### Request lifecycle (RAG query)

```
Browser → Nginx (user :5173 / admin :5174)
       → proxy_pass /api/ → FastAPI (:8000)
       → POST /api/v1/chat/
            1. Auth: get_optional_user  (JWT decode → db.users lookup)
            2. Guest? validate db.guest_sessions.expires_at
            3. generate_rag_response
                 ├─ retrieval.retrieve_context
                 │     └─ embeddings.embed_text (BAAI/bge-m3)
                 │     └─ qdrant.search (Filter: active + RBAC access_level/department/club)
                 │     └─ score >= SIMILARITY_THRESHOLD (0.65)
                 ├─ memory.get_conversation_context (recent 10 + summary)
                 ├─ build prompt (system guardrails + context + profile + question)
                 ├─ ollama.generate_chat_completion (max_tokens=1024, T=0.2)
                 └─ memory.add_message (+ auto-summary every 10 turns)
       → 200 OK with answer + sources
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5, TypeScript 5.6, Tailwind CSS 3, React Router 6, TanStack React Query 5, lucide-react icons |
| **Frontend delivery** | Nginx (serves built SPA, reverse-proxies `/api/` to backend) |
| **Backend** | FastAPI, Python 3.11+, Uvicorn, Pydantic v2, `pydantic-settings` |
| **LLM** | Ollama serving `qwen3.5:4b` (configurable), accessed via OpenAI-compatible `AsyncOpenAI` client |
| **Embeddings** | `sentence-transformers` loading `BAAI/bge-m3` (multilingual, ~1024-dim), HF cache backed by Docker volume |
| **Vector DB** | Qdrant v1.12 (cosine distance, payload-filtered search) |
| **Database** | MongoDB 7.0 via async `pymongo` (`AsyncMongoClient`) |
| **Object storage** | MinIO (S3-compatible, bucket `campus-documents`) |
| **Auth** | JWT (`python-jose`), Argon2 password hashing (`passlib`) |
| **Document parsing** | `pymupdf` (PDF), `python-docx` (DOCX), `openpyxl` (XLSX), `pandas` (CSV), built-in (TXT/MD) |
| **Orchestration** | Docker Compose v2 (8 services + 2 init jobs) |

---

## Backend Deep Dive

The active backend lives under `backend/app/` and follows an **async, modular** design. The application code is organized as:

```
backend/app/
├── main.py              # FastAPI app, lifespan, admin seeding
├── config.py            # pydantic-settings Settings (config & env)
├── api/v1/              # Active HTTP routes (auth, admin, documents, chat, health, campus, events)
├── core/                # security.py (JWT, hashing), permissions.py (RBAC deps)
├── db/                  # mongodb.py (async connection), models.py (Pydantic schemas)
├── rag/                 # pipeline.py, retrieval.py, ingestion.py, chunking.py, memory.py
├── embeddings/          # embedding_service.py
├── vector/              # qdrant_client.py, sync.py (structured data syncing)
├── llm/                 # ollama_client.py
└── documents/           # base.py, factory.py, pdf.py, docx.py, xlsx.py, csv.py, txt.py
```

> Note: `app/routes/`, `app/services/`, and `app/database/` are an **older, unmaintained synchronous tree** that is **not wired into `main.py`** and references a non-existent top-level `config` module. They are kept for reference only and are unreachable at runtime.

### 3.1 Application Entry & Lifespan

`app/main.py` constructs the `FastAPI` app, attaches `CORSMiddleware` (origins parsed from `CORS_ORIGINS`), registers the single `api_router` under `/api/v1`, and uses `@app.on_event("startup")` / `@app.on_event("shutdown")` lifecycle hooks:

- **Startup**: `await connect_to_mongo()` — opens the async Mongo client, binds 15 collections, and creates indexes (unique `users.email`, sparse-unique `users.student_id`, TTL on `guest_sessions.expires_at` and `password_reset_tokens.expires_at`). Then `seed_default_admin()` idempotently inserts the principal admin (`principal@kpriet.ac.in` / `123456`) if absent — see [How to Add the First Admin](#how-to-add-the-first-admin).
- **Shutdown**: `await close_mongo_connection()`.

**Eager singleton bootstrapping:** the embeddings model (`BAAI/bge-m3`, ~2 GB) and the Qdrant collection setup happen **at first module import** (transitively via `api/v1/__init__.py → health.py → qdrant_client → embedding_service`). As a result:

- **MongoDB**: mandatory at startup (blocks boot).
- **Qdrant**: soft dependency — `_ensure_collection` logs and continues if Qdrant is unreachable.
- **HuggingFace cache for `bge-m3`**: mandatory — startup crashes if the model can't be loaded (offline-miss + network failure).
- **Ollama**: lazy — only contacted on the first chat request; the app boots even if Ollama is down.

### 3.2 RAG Pipeline

The RAG pipeline is the heart of the backend and lives in `app/rag/`. It is composed of five collaborating modules:

| Module | Responsibility |
|---|---|
| `pipeline.py` | Orchestrates a single query: retrieve → context → memory → prompt → generate → persist. |
| `retrieval.py` | Builds the Qdrant authorization `Filter` and runs the vector search. |
| `chunking.py` | Splits parser-emitted chunks into index-sized windows (`CHUNK_SIZE` / `CHUNK_OVERLAP`). |
| `ingestion.py` | Background-job entry point that parses → chunks → embeds → upserts a document. |
| `memory.py` | Conversational memory: recent messages + auto-summarization. |
| `sync.py` | Background task entry point to vectorize and sync structured MongoDB entities (Events, Departments, Clubs, Transport, Campus Data) into Qdrant for RAG. |

#### Query pipeline — `generate_rag_response`

Located in `app/rag/pipeline.py`. The flow is:

1. **Retrieve context** (`pipeline.py:15-17`) — `retrieve_context` runs inside `asyncio.to_thread(...)` so the synchronous Qdrant search blocks a worker thread, not the event loop. See [Vector Database (Qdrant)](#34-vector-database-qdrant) and the RBAC filter below.
2. **Format context** (`pipeline.py:25-45`) — each retrieved chunk is rendered into a numbered list annotated with provenance (`filename`, `page`, `sheet`, `row`, `section`). The raw payload dicts are collected into a `sources` list returned to the API caller.
3. **Conversation memory** (`pipeline.py:48`) — `get_conversation_context(conversation_id, is_guest)` returns the last 10 messages plus any stored summary.
4. **Prompt construction** (`pipeline.py:51-91`):
   - **System prompt** (`:51-65`): KPRIET-scoped guardrails. Models must use retrieved context as the primary source, refuse to hallucinate KPRIET-specific facts, may answer general-knowledge questions, and must never reveal the system prompt, raw chunks, embeddings, or chain-of-thought.
   - **User prompt** (`:68-83`): injects the user's `Role / Department / Year`, an optional `CONVERSATION SUMMARY`, a fenced `CAMPUS CONTEXT:` block with the formatted chunks, then `USER QUESTION:` and `Answer:`.
   - **Message list** (`:85-91`): `[system] + recent_messages + [user_prompt]`.
5. **Generate** (`pipeline.py:94`) — `ollama_client.generate_chat_completion(messages)` with hard-coded `max_tokens=1024`, `temperature=0.2` (deterministic-leaning).
6. **Persist** (`pipeline.py:97-99`) — appends the user and assistant turns to the conversation (and the `sources` on the assistant turn).

#### Retrieval & authorization — `retrieval.py`

`build_auth_filter(user_profile, is_guest, requested_scope)` constructs a Qdrant `Filter` that enforces RBAC at the **vector search** layer (not just the API layer):

- Always: `must = [active == True]`.
- **Guest** → adds `must = [access_level == "public"]` (public docs only).
- **Authenticated non-admin** → a `should` clause OR-ing `public` + `students`; faculty additionally OR `faculty`. Plus nested `must` conditions: `access_level == "department" AND department_id == user_dept`, and `access_level == "club" AND club_id IN user_clubs`.
- **Admin** → no additional role restriction (sees everything).
- Caller-supplied `requested_scope` can only **narrow** results (e.g. a specific `department_id`, `club_id`, `category_id`).

`retrieve_context(query, user_profile, is_guest, requested_scope, top_k=5)` calls `qdrant_client.search(query, filters, top_k)`. Hits below `SIMILARITY_THRESHOLD` (default `0.65`) are discarded.

#### Ingestion — `process_document_background` & `sync_entity_to_qdrant`

- `app/rag/ingestion.py` is the entry point invoked by FastAPI's `BackgroundTasks` for physical file uploads. See [Async Document Ingestion Jobs](#39-async-document-ingestion-jobs) for the full state machine.
- `app/vector/sync.py` is invoked by `BackgroundTasks` in the Admin routes to instantly vectorize structured data (e.g., when an Event or Department is created/updated in the UI). Events index their poster images and registration links so the Chat AI can natively render them in message bubbles.

#### Conversational memory — `memory.py`

- `get_conversation_context(conversation_id, is_guest)` — guests: read `db.guest_sessions` and return the last 10 messages (no summary). Authenticated users: read `db.conversations` (for the stored `summary`) and the last 10 `db.messages` ordered by `created_at`.
- `add_message_to_conversation(...)` — guests: `$push` into `guest_sessions.messages`. Authenticated users: insert into `db.messages` and upsert `db.conversations` (auto-titling new conversations with the first 60 chars, `$inc message_count` otherwise).
- **Auto-summarization** — every time `message_count % 10 == 0`, the LLM (`summarize_conversation`, `max_tokens=256`) regenerates a concise summary that is persisted on the conversation doc. Guests never get summaries.

### 3.3 Document Processing

`app/documents/` implements a pluggable parser factory. All parsers inherit from `BaseParser` and return `List[DocumentChunk]` with fields `{ text, page?, section?, sheet?, row? }`.

#### Factory — `factory.py`

`get_parser(filename)` dispatches on the lowercased extension:

| Extension(s) | Parser | Library | Unit per chunk | Metadata |
|---|---|---|---|---|
| `.pdf` | `PDFParser` | `pymupdf` (`fitz`) | One chunk per page | `page` (1-indexed) |
| `.docx`, `.doc` | `DOCXParser` | `python-docx` | One chunk per non-empty paragraph; one chunk per table row (cells joined with ` \| `) | `section` (set when a `Heading`-style paragraph is parsed; tables use `section="Table"`), `row` (1-indexed) |
| `.xlsx`, `.xls` | `XLSXParser` | `openpyxl` | One chunk per non-header row, per sheet; rendered `Sheet: X, Row N: header=val, ...` | `sheet`, `row` (1-indexed) |
| `.csv` | `CSVParser` | `pandas` | One chunk per data row, rendered `Row N: col=val, ...` (NaN cells skipped) | `row` (1-indexed) |
| `.txt`, `.md` | `TXTParser` | built-in | One chunk per non-blank line | `section` (updated whenever a line begins with `#`) |
| unknown | `None` | — | upload is rejected | — |

**Two-stage chunking:** parsers emit **coarse** chunks (one per natural unit). The RAG layer's `chunk_document` (`app/rag/chunking.py:27-51`) then re-splits oversized chunks using a sliding window over **words** (step = `CHUNK_SIZE − CHUNK_OVERLAP`), preserving the original `page/section/sheet/row` provenance on every sub-chunk. Empty chunks are skipped.

**Config knobs** (`app/config.py`):

- `CHUNK_SIZE = 700` (words)
- `CHUNK_OVERLAP = 100` (words)
- `TOP_K = 5`, `SIMILARITY_THRESHOLD = 0.65`

> `MIN_CHUNK_SIZE`, `MAX_CHUNK_SIZE`, and `MAX_UPLOAD_SIZE_MB` are defined in `config.py` but **not enforced** by the active path — they exist for forward compatibility.

**Provenance propagation:** `page`/`section`/`sheet`/`row` flow from each parser → `DocumentChunk` → Qdrant payload at `ingestion.py:57-61` → the RAG prompt's context block (`pipeline.py:32-40`) → the API `sources` array surfaced in `/api/v1/chat/` responses.

**Error handling:** PDF/DOCX parsers `raise RuntimeError` on failure (so the job is marked `failed` with a persisted error). CSV/TXT/XLSX currently swallow exceptions and return `[]` — a failed parse looks like an empty document from the job's perspective.

### 3.4 Vector Database (Qdrant)

Implemented in `app/vector/qdrant_client.py` as a module-level singleton `qdrant_client = VectorStoreClient()`.

**Collection setup** — `_ensure_collection()` runs at construction. If the configured collection (`settings.effective_collection` → `COLLECTION_NAME` else `QDRANT_COLLECTION` else `campus_documents`) doesn't exist, it is created with `VectorParams(size=embedding_service.dimension, distance=Distance.COSINE)`. The collection dimension is taken from the embeddings singleton, so vector and embedding services are tightly coupled at boot.

**API surface:**

| Method | Behavior |
|---|---|
| `upsert_points(points)` | `points` is `List[(id, vector, payload)]`. **Note:** the caller-supplied `id` is discarded and a fresh `uuid.uuid4()` is minted per point. Re-indexing a document therefore creates new vectors; cleanup relies on `delete_by_document_id`. |
| `delete_by_document_id(document_id)` | Deletes via payload `Filter(must=[document_id == <id>])` — works regardless of random point ids. |
| `search(query, filters, top_k=5)` | Embeds the query, prefers `client.query_points` (newer API) with a backward-compatible `client.search` fallback, then drops results below `SIMILARITY_THRESHOLD = 0.65`. Any exception is logged and returns `[]` (graceful degradation). |

**Configuration:**

- `QDRANT_URL` (default `http://localhost:6333`)
- `QDRANT_API_KEY` (optional — only sent when non-empty)
- `COLLECTION_NAME` / `QDRANT_COLLECTION` (default `campus_documents`)
- `TOP_K = 5`, `SIMILARITY_THRESHOLD = 0.65`
- Distance metric: hard-coded `Distance.COSINE`.

The Qdrant service in Docker is `qdrant/qdrant:v1.12.0`, exposing `:6333` (HTTP/gRPC) and `:6334` (gRPC TLS), with data persisted on the `qdrant_data` named volume.

### 3.5 MongoDB (Application Database)

Implemented in `app/db/mongodb.py` using the **async** `pymongo.AsyncMongoClient` API (pymongo 4.9+).

**Connection lifecycle:**

- `connect_to_mongo()` — creates the async client, selects `MONGO_DB_NAME`, and binds 15 collection references on the module-level `db` singleton. Then creates indexes:
  - `users.email` — **unique**
  - `users.student_id` — **sparse unique** (multiple `null`s allowed, uniqueness enforced on present values)
  - `guest_sessions.expires_at` — **TTL index** (`expireAfterSeconds=0`) auto-deletes expired guest sessions
  - `password_reset_tokens.expires_at` — **TTL index** auto-cleans reset tokens
- `close_mongo_connection()` — closes the client.

**Collections** (bound in `mongodb.py:36-51`):

| Collection | Purpose |
|---|---|
| `users` | Accounts (role ∈ `student` / `faculty` / `admin`), credentials, profile |
| `sessions` | Per-login refresh-token tracking (enables logout/revocation) |
| `password_reset_tokens` | Self-serve + admin-issued reset tokens, single-use |
| `documents` | Uploaded document metadata + processing status |
| `processing_jobs` | Async ingestion job state machine |
| `conversations` / `messages` | Authenticated-user conversation history + LLM summaries |
| `guest_sessions` | Anonymous chat container (TTL-expired) |
| `departments`, `clubs`, `categories` | Taxonomy used by RBAC filters |
| `transport`, `campus_data` | Public campus info endpoints |
| `permissions`, `audit_logs`, `settings` | Reserved for future RBAC/audit surface |

**Schemas** — `app/db/models.py` defines Pydantic-style models (`UserModel`, `DocumentMetadata`, `ProcessingJob`, `Department`, `Club`, `Category`, `Conversation`, `Message`, `GuestSession`, `AuditLog`). These are **declarative documentation**: most routes operate on raw dicts against MongoDB rather than validating through the Pydantic models. The DB layer is effectively schemaless at the application boundary, with constraints enforced via the indexes above.

### 3.6 MinIO (Object Storage)

MinIO is deployed as an S3-compatible object store (`minio/minio`) with a dedicated init job (`createbuckets`, based on `minio/mc`) that:

1. Polls MinIO readiness with exponential backoff.
2. Creates the bucket `campus-documents` (`mc mb --ignore-existing`).
3. Sets the bucket to `anonymous download` for public read	scoping.

Web console on port `9001`, S3 API on port `9000`, data on the `minio_data` volume.

> **Caveat — see [Known Caveats](#known-caveats):** The **active** upload route (`POST /api/v1/documents/upload`) currently **does not use MinIO**. Files are spooled to the OS temp dir, parsed, and discarded — they are not persisted to object storage. A full MinIO client (`MinIOStorageManager` in `app/database/minio_client.py`) exists in the legacy tree, with `upload_file` / `upload_stream` / `delete_file` / `get_file_path` semantics, but it is not wired into `main.py`. The infrastructure is in place; integration is pending.

### 3.7 Embeddings & LLM

#### Embeddings — `app/embeddings/embedding_service.py`

- Model: `BAAI/bge-m3` (multilingual, ~1024-dim) via `sentence-transformers`.
- **Offline-first loading strategy** (`:14-22`):
  1. First attempt: `SentenceTransformer(model_name, local_files_only=True)` — uses only the HuggingFace cache, no network call.
  2. On local-cache miss: up to **3 retries** with `local_files_only=False` (allows download) and exponential backoff `sleep(2 * attempt)`.
  3. Final failure: raises (blocks app startup).
- **Dimension discovery** (`:34-38`): tries `model.get_sentence_embedding_dimension()`, else falls back to `len(model.encode("test"))`.
- API: `embed_text(str) → list[float]`, `embed_texts(list[str]) → list[list[float]]`.
- **Persistence:** The model is cached in the Docker named volume `hf_cache` mounted at `/root/.cache/huggingface` inside the backend container (see `docker-compose.yml:128-129`). After the first successful download, subsequent `docker compose` restarts and rebuilds load the model offline — no repeated multi-GB downloads.

#### LLM — `app/llm/ollama_client.py`

- Client: `openai.AsyncOpenAI` pointed at Ollama's **OpenAI-compatible** endpoint (`{OLLAMA_URL}/v1`). Default timeout **180s**.
- Model resolution (`_get_active_model`, `:14-57`) is **lazy and self-healing**. It lists models from Ollama and resolves the configured target against available models in priority:
  1. Exact match in the available list.
  2. Base-tag match (strip `:tag`, substring match).
  3. Keyword match (`3.5`, `4b`, `3b`, `qwen`, `phi`, `llama`).
  4. Fallback to the first available model.
  - On any listing failure the resolved id is **cache-busted** (`generate_chat_completion` resets `_resolved_model = None` on error) so the next call re-resolves.
- `generate_chat_completion(messages, max_tokens=1024, temperature=0.2)` (defaults hard-coded in the signature). On exception it logs and returns a static apology string (does **not** raise).
- Generation is **one-shot blocking** — there is no streaming (`Stream=True`/`StreamingResponse` does not exist anywhere in the codebase).
- Ollama runs in its own container (`ollama/ollama:latest`), serving on `:11434`, with models persisted on the `ollama_data` volume. An init job (`ollama-init`) polls Ollama on boot and pulls `qwen3.5:4b` **only if missing** — restarts skip the download.

### 3.8 Authentication & RBAC

Implemented in `app/core/security.py` (JWT + hashing) and `app/core/permissions.py` (FastAPI dependencies).

#### Password hashing

`passlib.context.CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")` — **Argon2 primary, bcrypt fallback**. `get_password_hash` / `verify_password` wrap the context.

#### JWT

- Algorithms: `HS256` (`JWT_ALGORITHM`). Secrets resolved via `settings.effective_jwt_secret_key` → `JWT_SECRET_KEY` → `SECRET_KEY` → a hard-coded fallback (override this in production via `.env`).
- `create_access_token(subject)` — default expiry `ACCESS_TOKEN_EXPIRE_MINUTES` (1440 min = 24h). Payload `{"exp", "sub": <ObjectId str>}`.
- `create_refresh_token(subject)` — default expiry `REFRESH_TOKEN_EXPIRE_DAYS` (7d). Same payload shape — access and refresh differ only by expiry (no `type` claim).
- `decode_token(token)` — returns payload dict or `None` on `JWTError`.

#### RBAC dependencies

Two `OAuth2PasswordBearer` schemes share `tokenUrl="/api/v1/auth/login"`. The required one raises 401 on a missing token; the optional one (`auto_error=False`) yields `None` so the chat endpoint can serve guests.

| Dependency | Effect |
|---|---|
| `get_current_user` | Decodes JWT, looks up `db.users` by `ObjectId(sub)`, 401 if invalid, 400 if `active=False`. |
| `get_optional_user` | Same, but returns `None` instead of raising — enables guest path on `/chat`. |
| `get_current_active_admin` | Requires `role == "admin"`, else 403. |
| `get_current_active_faculty` | Requires `role ∈ {"admin", "faculty"}`, else 403. Gates document upload. |

#### Roles

Three roles stored on `users.role`: `student`, `faculty`, `admin`. There is also a **guest pseudo-role** (no DB user) routed through `chat.py` (`{"role": "guest"}`) and honored in `build_auth_filter` (`retrieval.py:14-16`) restricting to `access_level == "public"` only.

| Role | At API layer | At retrieval layer (`build_auth_filter`) |
|---|---|---|
| `guest` | Only `/chat` endpoints | `public` only |
| `student` | `/chat`, their own conversations | `public` + `students` |
| `faculty` | `/chat` + `/documents/upload` | `public` + `students` + `faculty` + their `department` + `club` |
| `admin` | Full `/admin/*` + `/documents` | All active documents (no role restriction) |

#### Guest sessions

`POST /api/v1/chat/guest/session` creates a `guest_sessions` doc `{ guest_session_id: UUID, messages: [], expires_at: now + GUEST_SESSION_TTL_HOURS (24), status: "active" }`. The TTL index auto-expires the doc. Guest history lives **inside** the `messages` array (capped at the last 10 in `memory.py`); no summary is generated for guests.

#### Token revocation

JWTs themselves are stateless. Server-side revocation is performed by deleting rows from `db.sessions`:

- **Logout** deletes all sessions for the user.
- **Change-password** / **reset-password** also delete all sessions (invalidating the refresh token). **Access tokens** (24h) remain usable until natural expiry — there is no blocklist.

### 3.9 Async Document Ingestion Jobs

Ingestion is implemented as a FastAPI `BackgroundTasks` job — **in-process**, not a Celery/RQ queue.

#### Trigger — `POST /api/v1/documents/upload`

1. Validates the caller via `get_current_active_faculty` (admin or faculty only).
2. Spools the upload to `tempfile.gettempdir()`.
3. Inserts a `documents` doc with `status="uploaded"` and `access_level="public"` (default).
4. Inserts a `processing_jobs` row `{ document_id, status: "uploaded" }` and captures `job_id`.
5. Schedules `background_tasks.add_task(process_document_background, job_id, document_id, file_path, filename)` and **returns immediately** with `{ document_id, job_id }`.

#### Job state machine — `process_document_background` (`app/rag/ingestion.py`)

| `processing_jobs.status` | Trigger |
|---|---|
| `uploaded` (initial) | inserted at upload time |
| `processing` + `started_at` | first line of the background task |
| `processed` + `completed_at` + `chunks_created` + `vectors_stored` | successful upsert |
| `failed` + `error` + `completed_at` | any exception caught |

The parent `documents.status` mirrors the job (`uploaded → processed / failed`), and on failure `processing_error` is persisted on the document doc.

#### Inside the work

1. `get_parser(filename)` → parser → `List[DocumentChunk]`.
2. `chunk_document(raw_chunks)` enforces `CHUNK_SIZE` / `CHUNK_OVERLAP`.
3. Fetch the document's Mongo metadata (departments, club, audience, access_level, …).
4. For each chunk: `embedding_service.embed_text(chunk.text)`; build a payload with `chunk_id={document_id}_{idx}`, `document_id`, `department_id`, `club_id`, `category_id`, `access_level`, `academic_year`, `active`, `version`, `document_type`, `filename`, plus provenance `page/section/sheet/row/chunk_text`.
5. `qdrant_client.upsert_points(points)`.

#### Observability

- `GET /api/v1/admin/jobs` — last 50 jobs, sorted by `started_at` desc.
- `GET /api/v1/admin/stats` — dashboard counters, including the 6 most recent jobs.

> **Caveats** — there is no retry mechanism (`ProcessingJob.retry_count` exists but is never incremented), no horizontal scaling, no deduplication, and no task queue. A worker restart mid-job leaves the `processing_jobs` row stuck at `processing`. Document deletion does not cancel an in-flight job, so a racing delete-then-process may re-create orphan vectors.

### 3.10 API Surface

All active routes are mounted under `/api/v1` via `app.include_router(api_router, prefix="/api/v1")` (`main.py:61`). Six sub-routers are included:

| Router | Prefix | Notes |
|---|---|---|
| auth | `/api/v1/auth` | login, logout, me, change/forgot/reset password |
| chat | `/api/v1/chat` | chat (auth or guest), guest session, conversations |
| documents | `/api/v1/documents` | upload (faculty/admin) |
| admin | `/api/v1/admin` | users, documents, taxonomy, jobs, stats (admin only) |
| campus | `/api/v1/campus` | public campus directory (read-only) |
| health | `/api/v1/health` | liveness + Mongo/Qdrant health |

Interactive OpenAPI documentation is available at **[http://localhost:8000/docs](http://localhost:8000/docs)**.

#### Auth

| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/v1/auth/login` | none — accepts `identifier` (email **or** student_id) + password; issues access+refresh; inserts a `sessions` row |
| `POST` | `/api/v1/auth/logout` | required — deletes all sessions for the user |
| `GET`  | `/api/v1/auth/me` | required — current profile + role |
| `POST` | `/api/v1/auth/change-password` | required — verifies current, hashes new, revokes sessions |
| `POST` | `/api/v1/auth/forgot-password` | none — issues 30-min reset token (returned in dev) |
| `POST` | `/api/v1/auth/reset-password` | none — validates token + marks `used`, revokes sessions |

#### Chat

| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/v1/chat/` | optional — auth or guest; guests must supply a valid `guest_session_id` |
| `POST` | `/api/v1/chat/guest/session` | none — creates a guest session |
| `GET`  | `/api/v1/chat/conversations` | required — last 100, sorted `updated_at` desc |
| `GET`  | `/api/v1/chat/conversations/{id}/messages` | required — chronological messages |
| `DELETE` | `/api/v1/chat/conversations/{id}` | required — deletes conversation + messages |

#### Documents

| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/v1/documents/upload` | admin **or** faculty — async background ingestion |

#### Admin (all require admin role)

| Method | Path |
|---|---|
| `GET` / `POST` | `/api/v1/admin/users` (+ `PATCH` / `DELETE` / `POST .../reset-password` / `POST .../generate-reset-link` on `/users/{id}`) |
| `GET` | `/api/v1/admin/stats` |
| `GET` | `/api/v1/admin/documents` (+ `DELETE /{id}` deletes Qdrant vectors + Mongo doc + jobs) |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/v1/admin/departments[/{id}]`, `/clubs[/{id}]`, `/categories[/{id}]`, `/transport[/{id}]`, `/campus-data[/{id}]` |
| `GET` | `/api/v1/admin/jobs` — last 50 ingestion jobs |

#### Campus (public, read-only)

| Method | Path |
|---|---|
| `GET` | `/api/v1/campus/departments`, `/clubs`, `/transport`, `/info`, `/documents` |

#### Health

| Method | Path | Result |
|---|---|---|
| `GET` | `/api/v1/health/` | `{ "status": "ok" }` |
| `GET` | `/api/v1/health/mongodb` | Mongo `ping` result |
| `GET` | `/api/v1/health/qdrant` | Qdrant collections + count |

---

## Frontend Architecture

The frontend is a **Yarn/npm workspaces monorepo** (`frontend/package.json` declares `workspaces: ["apps/*", "packages/*"]`) with two independent SPAs.

### Apps

| App | Directory | Port (dev) | Port (docker) | Purpose |
|---|---|---|---|---|
| **User** | `frontend/apps/user` | `5173` | `5173` (Nginx) | Student & guest chat — create a guest session, ask questions, view conversation history, log in to persist conversations. |
| **Admin** | `frontend/apps/admin` | `5174` | `5174` (Nginx) | Admin portal — manage users, departments, clubs, categories, transport; upload documents; observe ingestion jobs; view dashboard stats. |

### Shared stack

- **React 18** + **ReactDOM 18**, **TypeScript 5.6**, **Vite 5** (build + dev server).
- **Tailwind CSS 3** + `autoprefixer` + `postcss` for styling; `clsx` + `tailwind-merge` for conditional classNames.
- **React Router 6** for client-side routing.
- **TanStack React Query 5** for server state (caching, refetch, mutations against the FastAPI backend).
- **lucide-react** for icons.

### Workspace structure

```
frontend/
├── package.json          # workspace root
├── apps/
│   ├── user/             # student/guest SPA — builds to Nginx-served static bundle
│   │   ├── Dockerfile    # multi-stage build: node → nginx
│   │   ├── nginx.conf    # SPA fallback + /api/ proxy with Docker DNS resolver
│   │   └── src/...
│   └── admin/            # admin SPA — same structure
└── packages/             # shared workspaces (UI primitives, utilities)
```

### Runtime behavior

- **Dev**: `npm run dev` in each app launches Vite on `:5173` / `:5174` with HMR; APIs are called directly against the FastAPI backend (CORS is configured for these origins in `.env`).
- **Docker (production)**: each app is built with `tsc -b && vite build`, then copied into an Nginx image. Nginx serves the static bundle and reverse-proxies `/api/` to the backend container. Crucially, both Nginx configs use **Docker's internal DNS resolver** (`127.0.0.11`) so they don't crash if the backend is temporarily unreachable during startup/restart — this is part of the resilient-startup strategy.

### Token storage

- Authenticated users store their JWT in `localStorage` under `campus_ai_token`.
- Admin sessions use `campus_admin_token`.
- Guests receive a transient `campus_guest_session` (no credentials required).

---

## System Workflows

This section walks through each user- and operator-facing scenario end-to-end, with sequence diagrams showing how the browser, Nginx, FastAPI, and the data/ML services cooperate.

### 5.1 Authentication Flow

Used by students, faculty, and admins to obtain JWTs. Guests skip this entirely (see 5.2).

```
 Browser (User/Admin SPA)                Nginx              FastAPI                 MongoDB
        │                                  │                   │                       │
        │  POST /api/v1/auth/login         │                   │                       │
        │  { identifier, password }        │                   │                       │
        ├─────────────────────────────────►│                   │                       │
        │                                  │ proxy_pass /api/  │                       │
        │                                  ├──────────────────►│                       │
        │                                  │                   │ db.users.findOne      │
        │                                  │                   ├──────────────────────►│
        │                                  │                   │◄──────────────────────┤
        │                                  │                   │                       │
        │                                  │                   │ verify_password       │
        │                                  │                   │ (Argon2 via passlib)  │
        │                                  │                   │                       │
        │                                  │                   │ create_access_token   │
        │                                  │                   │ create_refresh_token  │
        │                                  │                   │ (python-jose, HS256)  │
        │                                  │                   │                       │
        │                                  │                   │ db.sessions.insert   │
        │                                  │                   │ {user_id, refresh}   │
        │                                  │                   ├──────────────────────►│
        │  200 { access_token, refresh_token, user }          │                       │
        │◄─────────────────────────────────┤◄──────────────────┤                       │
        │                                  │                   │                       │
        │  localStorage.set campus_ai_token                    │                       │
        │  (or campus_admin_token for admin portal)           │                       │
```

- `identifier` may be either the user's **email** or their **student_id** — `auth.py:56` resolves both.
- A `sessions` row is inserted per login to enable refresh-token revocation on logout/password change.
- `get_optional_user` / `get_current_user` / `get_current_active_admin` / `get_current_active_faculty` decode the `Bearer` token on subsequent calls.

### 5.2 Guest Session Flow

Guests get a transient, TTL-expired chat identity without any credentials.

```
 Browser (User SPA)                      Nginx              FastAPI                 MongoDB
        │                                  │                   │                       │
        │  POST /api/v1/chat/guest/session  │                   │                       │
        ├─────────────────────────────────►│                   │                       │
        │                                  ├──────────────────►│                       │
        │                                  │                   │ db.guest_sessions    │
        │                                  │                   │   .insert({          │
        │                                  │                   │     guest_session_id │
        │                                  │                   │     (UUID),          │
        │                                  │                   │     messages: [],     │
        │                                  │                   │     expires_at: now+  │
        │                                  │                   │       TTL_HOURS(24),  │
        │                                  │                   │     status: "active"})│
        │                                  │                   ├──────────────────────►│
        │  200 { guest_session_id }                            │                       │
        │◄─────────────────────────────────┤◄──────────────────┤                       │
        │                                  │                   │                       │
        │  localStorage.set campus_guest_session               │                       │
```

- The TTL index on `guest_sessions.expires_at` (`mongodb.py:54-57`) auto-deletes the doc when it expires.
- The guest's chat history lives **inside** the `messages` array of this doc (no `db.messages` entries, no summary).

### 5.3 RAG Query Flow (Chat)

The core retrieval-augmented-generation loop — `POST /api/v1/chat/`. Runs for both authenticated users and guests.

```
 Browser                Nginx  FastAPI  embeddings  Qdrant  Ollama  MongoDB
   │                      │       │         │        │       │       │
   │ POST /api/v1/chat/   │       │         │        │       │       │
   │ {question, conv_id,  │       │         │        │       │       │
   │  guest_session_id?}  │       │         │        │       │       │
   ├─────────────────────►│       │         │        │       │       │
   │                      ├──────►│         │        │       │       │
   │                      │       │         │        │       │       │
   │                      │       │ get_optional_user (decode JWT)    │
   │                      │       ├──────────────────────────────────►│
   │                      │       │◄──────────────────────────────────┤
   │                      │       │ (if guest) validate guest_session│
   │                      │       │         expires_at               │
   │                      │       │                                   │
   │                      │       │ ── retrieve_context ──            │
   │                      │       │  build_auth_filter                │
   │                      │       │  (RBAC: active +                 │
   │                      │       │   access_level / dept / club)     │
   │                      │       │                                   │
   │                      │       │ embed_text(question)              │
   │                      │       ├───────►│                          │
   │                      │       │◄───────┤                          │
   │                      │       │                                   │
   │                      │       │ qdrant.search(vector,             │
   │                      │       │   filters, top_k=5)               │
   │                      │       ├──────────────►│                   │
   │                      │       │◄──────────────┤                   │
   │                      │       │  drop scores < 0.65               │
   │                      │       │     (SIMILARITY_THRESHOLD)       │
   │                      │       │                                   │
   │                      │       │ get_conversation_context         │
   │                      │       │   (last 10 msgs + summary)        │
   │                      │       ├──────────────────────────────────►│
   │                      │       │◄──────────────────────────────────┤
   │                      │       │                                   │
   │                      │       │ build prompt                      │
   │                      │       │   [system guardrails]             │
   │                      │       │   + recent_msgs                   │
   │                      │       │   + [user context+question]      │
   │                      │       │                                   │
   │                      │       │ ollama.generate_chat_completion   │
   │                      │       │   (max_tokens=1024, T=0.2)        │
   │                      │       ├────────────────────────────►│   │
   │                      │       │◄────────────────────────────┤   │
   │                      │       │                                   │
   │                      │       │ add_message_to_conversation      │
   │                      │       │   (user turn + assistant turn)   │
   │                      │       │   if msg_count % 10 == 0:        │
   │                      │       │     summarize_conversation via LLM
   │                      │       ├──────────────────────────────────►│
   │                      │       │                                   │
   │ 200 { answer, sources }        │                                   │
   │◄─────────────────────┤◄──────┤                                   │
```

Key points:

1. The Qdrant search is wrapped in `asyncio.to_thread` (`pipeline.py:15-17`) so the sync call doesn't block the event loop.
2. `build_auth_filter` enforces **role-based document scoping at the vector-search layer** — guests see only `public`, students see `public + students`, faculty adds `faculty + dept + club`, admins see everything.
3. The system prompt injects KPRIET-specific guardrails: use retrieved context as the primary source, never hallucinate campus facts, never reveal the prompt/chunks/embeddings.
4. Provenance (`filename`, `page`, `sheet`, `row`, `section`) is attached to each source returned to the caller, enabling citation display in the UI.

### 5.4 Document Upload & Ingestion Flow

Faculty and admins upload documents; ingestion runs asynchronously after the response is sent.

```
 Admin/Faculty SPA  Nginx  FastAPI  TempFS  parsers  embeddings  Qdrant  MongoDB
        │             │       │       │       │         │          │       │
        │ POST /api/v1/documents/upload (multipart)              │       │
        │   Authorization: Bearer <faculty/admin JWT>            │       │
        ├────────────►│       │       │       │         │        │       │
        │             ├──────►│       │       │         │        │       │
        │             │       │       │       │         │        │       │
        │             │       │ get_current_active_faculty       │       │
        │             │       │   (role in admin|faculty,   403) │       │
        │             │       │                                 │       │
        │             │       │ shutil.copyfileobj → tmp file   │       │
        │             │       ├──────►│                        │       │
        │             │       │       │                        │       │
        │             │       │ db.documents.insert            │       │
        │             │       │   {status:"uploaded",          │       │
        │             │       │    access_level:"public", ...} │       │
        │             │       ├──────────────────────────────────┼──────►│
        │             │       │ db.processing_jobs.insert      │       │
        │             │       │   {document_id, status:        │       │
        │             │       │    "uploaded"} → job_id        │       │
        │             │       ├──────────────────────────────────┼──────►│
        │             │       │ background_tasks.add_task(...) │       │
        │ 200 { document_id, job_id }           │               │       │
        │◄────────────┤◄──────┤                  │               │       │
        │                                        │               │       │
        │      ╔═══════════════ ASYNC BACKGROUND TASK ═══════════════╗  │
        │      ║                                  │              │   │  │
        │      ║ db.processing_jobs.update        │              │   │  │
        │      ║   {status:"processing", started_at}                          │
        │      ║                                  │              │   │  │
        │      ║ get_parser(filename) → parser    │              │   │  │
        │      ║ parser.parse(tmp_file)           │              │   │  │
        │      ║   → List[DocumentChunk] (coarse)  │              │   │  │
        │      ║                                  │              │   │  │
        │      ║ chunk_document(raw_chunks)       │              │   │  │
        │      ║   sliding window over words      │              │   │  │
        │      ║   CHUNK_SIZE=700, overlap=100     │              │   │  │
        │      ║   preserve page/section/sheet/row│              │   │  │
        │      ║                                  │              │   │  │
        │      ║ for each chunk:                  │              │   │  │
        │      ║   embedding_service.embed_text    │              │   │  │
        │      ║   build payload (RBAC + provenance)             │   │  │
        │      ║                                  │              │   │  │
        │      ║ qdrant.upsert_points             │              │   │  │
        │      ║   (mint fresh uuid per point)    │              │   │  │
        │      ║                                  │              │   │  │
        │      ║ db.processing_jobs.update        │              │   │  │
        │      ║   {status:"processed",            │              │   │  │
        │      ║    completed_at, chunks_created,  │              │   │  │
        │      ║    vectors_stored}                │              │   │  │
        │      ║ db.documents.update               │              │   │  │
        │      ║   {status:"processed"}            │              │   │  │
        │      ╚═══════════════════════════════════════════════════════╝
```

- Caller (faculty/admin) receives `{ document_id, job_id }` immediately; the work happens after the request returns via Starlette `BackgroundTasks`.
- Job status is observable via `GET /api/v1/admin/jobs` and the admin dashboard's recent-jobs feed.
- On failure, both `processing_jobs.status="failed"` (with `error`) and `documents.status="failed"` (with `processing_error`) are persisted.

### 5.5 Admin User Provisioning Flow

No public registration — administrators are the single source of truth for accounts.

```
 Browser (Admin SPA)             Nginx        FastAPI                MongoDB
   │                                │             │                      │
   │ POST /api/v1/admin/users       │             │                      │
   │   {name, email, student_id,   │             │                      │
   │    password, role, department, │             │                      │
   │    year, section}              │             │                      │
   ├──────────────────────────────►│             │                      │
   │                                ├────────────►│                      │
   │                                │             │ get_current_active_admin
   │                                │             │   (role=="admin", else 403)
   │                                │             │                      │
   │                                │             │ uniqueness check:    │
   │                                │             │   db.users.findOne by email
   │                                │             │   db.users.findOne by student_id
   │                                │             ├─────────────────────►│
   │                                │             │◄─────────────────────┤
   │                                │             │   (409 Conflict if dup)
   │                                │             │                      │
   │                                │             │ get_password_hash(plain) (Argon2)
   │                                │             │                      │
   │                                │             │ db.users.insert       │
   │                                │             │   {role, email, pwd,  │
   │                                │             │    student_id, dept,  │
   │                                │             │    year, section,    │
   │                                │             │    active:true, created_at}
   │                                │             ├─────────────────────►│
   │ 201 { user }                  │             │                      │
   │◄──────────────────────────────┤◄────────────┤                      │
```

- After creation, the user can immediately log in at the User Portal (`:5173`) using **either** their email or student_id.

### 5.6 Password Reset Flow

Two entry points: self-service (forgot-password) and admin-issued reset link.

```
Self-service reset                           Admin-issued reset
─────────────────────                        ────────────────────

Browser → Nginx → FastAPI                    Admin SPA → FastAPI
                  │                                          │
 POST /auth/forgot-password                  POST /admin/users/{id}/generate-reset-link
   { email }                                   (admin JWT)
   │                                           │
   │ generate reset token (JWT-encoded)        │ generate 60-min reset token
   │ db.password_reset_tokens.insert           │ db.password_reset_tokens.insert
   │   {user_id, token, expires_at, used:false} │   {user_id, token, expires_at, used:false}
   │ (in dev: token returned in response)     │ (in dev: token returned in response)
   │                                           │
   ▼                                           ▼
 Email/SMS link delivery (out-of-band)         Email link delivery (out-of-band)
   https://.../reset?token=<token>            https://.../reset?token=<token>
   │                                           │
   ▼                                           ▼
 Browser → Nginx → FastAPI:                   Browser → FastAPI:
 POST /auth/reset-password                    POST /auth/reset-password
   { token, new_password }                      { token, new_password }
   │                                           │
   │ decode_token(token) → verify exp/sub      │ (same handler)
   │ db.password_reset_tokens.findOne           │
   │   filter {token, used:false}              │
   │ verify expires_at not passed              │
   │ get_password_hash(new_password)           │
   │ db.users.update password_hash             │
   │ db.password_reset_tokens.update used=true │
   │ db.sessions.delete_many({user_id})        │
   │   ↳ invalidate all refresh tokens         │
   ▼                                           ▼
 200 {message:"Password reset"}               200 {message:"Password reset"}
```

Notes:

- `password_reset_tokens` has a TTL index so unused tokens auto-expire.
- `used: true` enforces single-use; all sessions are deleted to revoke the user's refresh tokens.
- **Access tokens** (24h) stay valid until natural expiry — there is no blocklist.

### 5.7 Conversation Memory & Auto-Summary Flow

```
    Each chat message
          │
          ▼
 add_message_to_conversation(conv_id, is_guest, role, content)
          │
          ├─ GUEST path:
          │    db.guest_sessions.update
          │      { $push: { messages: {...} } }
          │    cap displayed history at last 10 in memory.py
          │    (no summary generated for guests)
          │
          └─ AUTHENTICATED path:
               db.messages.insert({conversation_id, role, content, sources})
               db.conversations.upsert
                 if new:     create with title=first_60_chars, message_count=1
                 if exists:   $inc message_count, $set updated_at
               ─────────────────────────────────────
               IF (message_count % 10 == 0):
                  fetch all db.messages for conversation
                  summarize_conversation(messages) ──► Ollama (max_tokens=256)
                  db.conversations.update { summary: <new> }
               ─────────────────────────────────────
                   │
                   ▼
 Next query → get_conversation_context
   returns (last 10 chronological messages, summary)
                  │
                  ▼
 RAG prompt includes "CONVERSATION SUMMARY:" block
```

- Summaries are persisted on the `conversations` doc and injected into the system/user prompt on subsequent queries, giving the LLM long-term conversation context beyond the 10-message window.

### 5.8 Docker Bootstrap & Model Pull Flow

The zero-touch boot sequence for the whole stack. Time flows top to bottom; `exit 0` jobs are short-lived.

```
 docker compose up -d --build
        │
        ├──╸ mongodb ─────────────────────► Up      (mongo:7.0)
        ├──╸ minio ─────────────────────────► Up      (S3 API:9000 / Console:9001)
        ├──╸ qdrant ────────────────────────► Up      (qdrant/qdrant v1.12.0)
        ├──╸ ollama ────────────────────────► Up      (ollama/ollama:latest, GPU-aware)
        │
        ├──╸ createbuckets (one-shot)
        │      poll MinIO until ready (retry every 2s)
        │      mc mb --ignore-existing campus-documents
        │      mc anonymous set download campus-documents
        │      ─── exit 0 ───
        │
        ├──╸ ollama-init (one-shot)
        │      poll http://ollama:11434/api/tags until ready
        │      if model (OLLAMA_MODEL) present in /api/tags response:
        │         log "skipping download"
        │      else:
        │         POST /api/pull {"name": OLLAMA_MODEL}
        │      ─── exit 0 ───
        │
        └──╸ backend (build from ./backend)
               depends_on: mongodb, minio, qdrant, ollama
               startup:
                 connect_to_mongo (BLOCKING)        ─ bind 15 collections, create indexes
                 seed_default_admin (idempotent)    ─ insert principal@kpriet.ac.in/123456
                 first import of api/v1/* triggers:
                   EagerVectorStoreClient.ensure_collection (only logs on Qdrant miss)
                   EagerEmbeddingService load BAAI/bge-m3
                     ── local_files_only=True (offline-first)
                     ── on cache miss: 3 retries w/ network, then raise  (BLOCKING)
               healthcheck: curl :8000/api/v1/health/  start_period=30s
               ──── Up (healthy) ────

        ├──╸ frontend-user (depends_on: backend healthy)
        │      build node → nginx, serve :5173
        └──╸ frontend-admin (depends_on: backend healthy)
               build node → nginx, serve :5174
```

Persistence guarantees:

- `ollama_data` → LLM weights survive rebuilds (download once).
- `hf_cache` → embedding model survives rebuilds (download once).
- `mongodb_data`, `qdrant_data`, `minio_data` → runtime state survives restarts.

`docker compose down -v` wipes all five volumes — use with care.


## Docker & Deployment Guide

The entire stack is orchestrated by `docker-compose.yml` (Compose v2). There are **8 long-running services** plus **2 init jobs** (which exit `0` on success).

### Services

| # | Service | Container | Image | Purpose |
|---|---|---|---|---|
| 1 | `mongodb` | `campus_assistant_mongodb` | `mongo:7.0` | Application database; `mongodb_data` volume |
| 2 | `minio` | `campus_assistant_minio` | `minio/minio:RELEASE.2023-09-04T19-57-37Z` | S3 object storage; `minio_data` volume |
| 3 | `createbuckets` | `campus_assistant_minio_init` | `minio/mc:latest` | One-shot bucket creation with retry |
| 4 | `qdrant` | `campus_assistant_qdrant` | `qdrant/qdrant:v1.12.0` | Vector DB; `qdrant_data` volume |
| 5 | `ollama` | `campus_assistant_ollama` | `ollama/ollama:latest` | LLM server; `ollama_data` volume; GPU-aware `deploy.resources` (safely ignored without NVIDIA GPU) |
| 6 | `ollama-init` | `campus_assistant_ollama_init` | `curlimages/curl:latest` | One-shot model puller (only downloads if missing) |
| 7 | `backend` | `campus_assistant_backend` | Built from `./backend/Dockerfile` | FastAPI app; `hf_cache` volume; healthcheck against `/api/v1/health/` |
| 8 | `frontend-user` | `campus_assistant_frontend_user` | Built from `frontend/apps/user/Dockerfile` | Nginx-served user SPA |
| 9 | `frontend-admin` | `campus_assistant_frontend_admin` | Built from `frontend/apps/admin/Dockerfile` | Nginx-served admin SPA |

All services share the `campus_network` bridge network. Five persistent volumes are declared: `mongodb_data`, `minio_data`, `qdrant_data`, `ollama_data`, `hf_cache`.

### Resilient startup design

- **`ollama-init`** polls `http://ollama:11434/api/tags` until Ollama is ready, then checks whether the configured model is already present in the persistent `ollama_data` volume. Only if missing does it POST `/api/pull` — so the multi-GB download happens exactly **once**.
- **`createbuckets`** retries `mc alias set` until MinIO is reachable, then `mc mb --ignore-existing` and sets the bucket's anonymous policy.
- **Nginx dynamic DNS** — both frontend Nginx configs use Docker's internal DNS resolver (`127.0.0.11`) so they survive a backend restart instead of failing DNS resolution at boot.
- **Backend healthcheck** — `curl -f http://localhost:8000/api/v1/health/` with `start_period=30s`, `interval=15s`, `retries=5`. Frontends `depends_on` the backend, but Compose will start them once the backend is healthy.
- **Embedding cache** — the `hf_cache` volume mounted at `/root/.cache/huggingface` in the backend container means `BAAI/bge-m3` is downloaded once and then loaded offline-first (`local_files_only=True`) on subsequent boots.

### GPU support

`ollama` declares a `deploy.resources.reservations.devices` block requesting all NVIDIA GPUs. Compose silently ignores this section on hosts without an NVIDIA GPU, so the same `docker-compose.yml` works on CPU-only machines (with a noticeable inference latency penalty).

### Quick start

```bash
# 1. Enter the project
cd ChatBot

# 2. (Optional) configure environment
cp .env.example .env

# 3. Build and start the whole stack
docker compose up -d --build

# 4. Monitor initialization (model download + bucket creation + backend health)
docker compose logs -f ollama-init createbuckets backend
```

### Verifying the deployment

```bash
# All services Up/healthy, init containers exited 0
docker compose ps

# Smoke-test the backend
curl http://localhost:8000/api/v1/health/

# Open the portals
# User:  http://localhost:5173
# Admin: http://localhost:5174   (principal@kpriet.ac.in / 123456)
```

### Rebuilding a single service

```bash
# Rebuild just the backend after a code change
docker compose up -d --build backend

# Rebuild just one frontend
docker compose up -d --build frontend-user
```

### First-run checklist

1. `docker compose ps` shows all long-running services `Up` (the backend may take ~30s to become healthy while the embeddings model loads).
2. `campus_assistant_ollama_init` and `campus_assistant_minio_init` have exited `0`.
3. `curl http://localhost:8000/api/v1/health/` returns `{"status":"ok"}`.
4. The admin portal loads and `principal@kpriet.ac.in` / `123456` logs in.

### Persistent data & reset

```bash
# Stop and remove containers, KEEPING volumes (model cache, DBs)
docker compose down

# Stop and remove containers AND volumes (CAUTION: re-downloads models, wipes data)
docker compose down -v
```

### Production hardening checklist

Before exposing this beyond a trusted LAN, change these defaults:

- Set `JWT_SECRET_KEY`, `SECRET_KEY`, and `MINIO_ROOT_PASSWORD` to strong, unique secrets in `.env`.
- Change the seeded principal admin password immediately (`/api/v1/auth/change-password`).
- Run Ollama on a host with an NVIDIA GPU, or pick a smaller model (`OLLAMA_MODEL=qwen2.5:3b`) for CPU-only deployments.
- Put the frontends behind a TLS-terminating reverse proxy (Caddy/ Traefik) and tighten `CORS_ORIGINS`.
- Consider raising `ACCESS_TOKEN_EXPIRE_MINUTES` only if you can also implement an access-token blocklist — by default, access tokens remain valid until natural expiry even after logout (only the refresh token is revoked).
- Wire MinIO into the actual upload path (see [Known Caveats](#known-caveats)) so source files persist beyond parsing.

---

## Service Ports & Endpoints

| Port | Service | Container Name | Description |
|---|---|---|---|
| **5173** | Frontend User | `campus_assistant_frontend_user` | Student & Guest chat application |
| **5174** | Frontend Admin | `campus_assistant_frontend_admin` | Administrative portal for document & user management |
| **8000** | Backend API | `campus_assistant_backend` | FastAPI REST API & Swagger UI (`/docs`) |
| **11434** | Ollama LLM | `campus_assistant_ollama` | Local LLM server running `qwen3.5:4b` |
| **6333** | Qdrant (HTTP) | `campus_assistant_qdrant` | Vector database for RAG document retrieval |
| **6334** | Qdrant (gRPC) | `campus_assistant_qdrant` | Qdrant gRPC / TLS port |
| **9000** | MinIO API | `campus_assistant_minio` | S3-compatible object storage |
| **9001** | MinIO Console | `campus_assistant_minio` | Object storage web console |
| **27017** | MongoDB | `campus_assistant_mongodb` | Database for users, sessions, chats, and jobs |

---

## How to Add the First Admin

The **Principal Admin account is automatically seeded** idempotently on backend startup (`main.py:seed_default_admin`):

```text
Email    : principal@kpriet.ac.in
Password : 123456
Role     : admin
```

1. Open the Admin Portal: [http://localhost:5174](http://localhost:5174)
2. Log in with `principal@kpriet.ac.in` and `123456`.
3. **(Recommended)** Change the password immediately under account settings, or provision dedicated admin accounts.

---

## How Students Get Access

**There is no public self-registration.** Accounts are managed centrally by administrators:

1. Log in to [http://localhost:5174](http://localhost:5174).
2. Go to **Users** → **Add User**.
3. Fill in:
   - **Full Name**
   - **Email** (e.g. `student@kpriet.ac.in`)
   - **Student ID** (e.g. `22CSEA001`)
   - **Password**
   - **Role** (`student` or `faculty`)
   - **Department**, **Year**, **Section**
4. Click **Create User**.
5. Students can now log in at [http://localhost:5173](http://localhost:5173) using either their **Student ID** or **Email**.

---

## Environment Variables

Configured in `.env` (loaded by `docker-compose.yml` via `env_file`):

```env
# ========================================
# DATABASE CONFIGURATION
# ========================================
MONGO_URI=mongodb://mongodb:27017
MONGO_DB_NAME=campus_assistant_db

# ========================================
# STORAGE CONFIGURATION (MINIO)
# ========================================
MINIO_ENDPOINT=minio:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=campus-documents
MINIO_SECURE=false

# ========================================
# VECTOR DATABASE CONFIGURATION (QDRANT)
# ========================================
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=campus_documents

# ========================================
# LLM & EMBEDDING CONFIGURATION
# ========================================
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=qwen3.5:4b
EMBEDDING_MODEL_NAME=BAAI/bge-m3

# ========================================
# SECURITY & AUTHENTICATION
# ========================================
JWT_SECRET_KEY=generate_a_secure_random_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
GUEST_SESSION_TTL_HOURS=2

# ========================================
# APP CONFIGURATION
# ========================================
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000
MAX_UPLOAD_SIZE_MB=50
ENVIRONMENT=development
```

> Defaults shown above are from the shipped `.env.example`; many knobs also have code-level fallbacks in `app/config.py`.

---

## Troubleshooting & FAQ

### Q1: Does the model redownload every time I restart Docker?
**No.** Both the Ollama LLM model (`qwen3.5:4b`) and the Hugging Face embeddings (`BAAI/bge-m3`) are saved into persistent named Docker volumes (`ollama_data` and `hf_cache`). The `ollama-init` job checks if the model exists and skips the download if present; the embedding service loads from the cache first (`local_files_only=True`).

### Q2: How do I verify all services are running properly?
```bash
docker compose ps
```
You should see all long-running services `Up` (the backend may report `starting` for ~30s while the embeddings model loads), with `campus_assistant_ollama_init` and `campus_assistant_minio_init` having exited with code `0`.

### Q3: How do I completely reset all data?
```bash
# Stop containers and wipe volumes (caution: removes databases and cached models)
docker compose down -v
```

### Q4: The backend crashes on startup with a HuggingFace / sentence-transformers error.
The embeddings model must be loadable. On a fresh machine with no network, the offline-first loader will fail. Either let the first boot download it (requires network), or restore the `hf_cache` volume from a populated backup.

### Q5: Chat responses are an apology string ("…unable to connect to the LLM service…").
Ollama is unreachable or the configured model is not pulled. Verify `docker compose logs ollama` and `docker compose logs ollama-init`, and confirm `OLLAMA_MODEL` matches an available model (`curl http://localhost:11434/api/tags`).

### Q6: My document upload returns success but search never finds it.
Check the ingestion job in the admin portal (`/admin/jobs`) or via `GET /api/v1/admin/jobs`. A `failed` status persists the error on both the job and the document. Common causes: unsupported file type, password-protected PDF, or an empty parse (CSV/XLSX swallow parser errors and return `[]`).

### Q7: Can guests see student-only documents?
No. `build_auth_filter` enforces `access_level == "public"` for guests at the Qdrant search layer, independent of the API guard.

---

## Known Caveats

These are useful to know if you plan to extend the codebase:

1. **Two parallel backend trees.** `app/{rag,vector,embeddings,llm,documents,db,core,api}` is the **active, async** tree wired into `main.py`. `app/{routes,services,database}` is a **legacy, synchronous** tree that imports a non-existent top-level `config` module and is **not registered** — it would raise `ModuleNotFoundError` if imported.
2. **MinIO is not used by the active upload route.** Files are spooled to the OS temp dir, parsed, and discarded. A full MinIO client exists in the legacy tree but isn't wired in.
3. **No streaming.** All LLM responses are one-shot blocking completions; there is no `StreamingResponse`.
4. **Access-token revocation is partial.** Only refresh tokens are tracked in `db.sessions` and revocable; access tokens remain valid until natural expiry.
5. **Chunk-id idempotency is broken.** `upsert_points` discards the caller's `chunk_id` and mints a fresh UUID per point, so re-indexing a document creates duplicates. Cleanup relies on `delete_by_document_id`.
6. **Defined-but-unused config knobs.** `MIN_CHUNK_SIZE`, `MAX_CHUNK_SIZE`, `MAX_UPLOAD_SIZE_MB`, and `LOCAL_FILES_ONLY` exist in `config.py` but are not enforced by the active code.
7. **Eagerly loaded singletons.** `embedding_service`, `qdrant_client`, and `ollama_client` are module-level singletons, so the embeddings model load and Qdrant collection setup happen at first import (transitively during app boot) — significant startup cost and tight coupling.
8. **No job queue / retry.** Ingestion is in-process via `BackgroundTasks`. A worker restart mid-job leaves the row stuck at `processing`; the `retry_count` field exists but is never incremented.
#   C a m p u s - B u d d y  
 #   C a m p u s - B u d d y  
 