import uuid
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
import config

class VectorStore:
    """Manages Qdrant vector storage using local HuggingFace embeddings.
    Supports dynamic add, search, deletion by doc_id, and full index clearing.
    """

    def __init__(self, collection_name: str = config.COLLECTION_NAME):
        self.collection_name = collection_name
        
        # Load HuggingFace Embedding Model
        print(f"[VectorStore] Loading HuggingFace embedding model '{config.EMBEDDING_MODEL_NAME}'...")
        try:
            self.embedder = SentenceTransformer(config.EMBEDDING_MODEL_NAME, local_files_only=config.LOCAL_FILES_ONLY)
        except Exception as e:
            if config.LOCAL_FILES_ONLY:
                print(f"[VectorStore Warning] Local model load failed ({e}). Attempting download...")
                self.embedder = SentenceTransformer(config.EMBEDDING_MODEL_NAME, local_files_only=False)
            else:
                raise e

        # Determine vector size dynamically
        dummy_vector = self.embedder.encode("test vector dimension")
        self.vector_dim = len(dummy_vector)
        print(f"[VectorStore] Embedding dimension: {self.vector_dim}")

        # Initialize Qdrant Client (Cloud or Local Disk Storage)
        if config.QDRANT_URL and config.QDRANT_URL.startswith("http"):
            try:
                print(f"[VectorStore] Initializing Qdrant connection to '{config.QDRANT_URL}'...")
                self.client = QdrantClient(
                    url=config.QDRANT_URL,
                    api_key=config.QDRANT_API_KEY if config.QDRANT_API_KEY else None
                )
                self._ensure_collection()
            except Exception as e:
                print(f"[VectorStore Warning] Connection to remote Qdrant failed ({e}). Falling back to local disk storage...")
                self.client = QdrantClient(path=config.QDRANT_STORAGE_PATH)
                self._ensure_collection()
        else:
            print(f"[VectorStore] Initializing Local Disk Qdrant storage at '{config.QDRANT_STORAGE_PATH}'...")
            self.client = QdrantClient(path=config.QDRANT_STORAGE_PATH)
            self._ensure_collection()

    def _ensure_collection(self):
        """Creates the Qdrant collection if it doesn't already exist."""
        try:
            collections = [c.name for c in self.client.get_collections().collections]
            if self.collection_name not in collections:
                print(f"[VectorStore] Creating Qdrant collection '{self.collection_name}'...")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.vector_dim,
                        distance=Distance.COSINE
                    )
                )
                print(f"[VectorStore] Collection '{self.collection_name}' created successfully.")
        except Exception as e:
            print(f"[VectorStore Warning] Failed to inspect/create Qdrant collection: {e}")

    def add_documents(self, records: List[Dict[str, Any]]) -> int:
        """Encodes document text chunks and upserts them into Qdrant."""
        if not records:
            print("[VectorStore] No records provided for vector indexing.")
            return 0

        print(f"[VectorStore] Embedding and indexing {len(records)} chunks...")
        texts = [r["text"] for r in records]
        embeddings = self.embedder.encode(texts, show_progress_bar=False)

        points = []
        for idx, (record, vector) in enumerate(zip(records, embeddings)):
            point_id = str(uuid.uuid4())
            payload = {
                "doc_id": record.get("doc_id", "default_doc"),
                "text": record["text"],
                "filename": record.get("filename", ""),
                "category": record.get("category", "General"),
                "chunk_index": record.get("chunk_index", 0),
                "chunk_id": record.get("chunk_id", f"chunk_{idx}")
            }
            points.append(PointStruct(id=point_id, vector=vector.tolist(), payload=payload))

        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        print(f"[VectorStore] Successfully upserted {len(points)} vector points into collection '{self.collection_name}'.")
        return len(points)

    def delete_by_doc_id(self, doc_id: str) -> bool:
        """Dynamically deletes all vector chunks associated with a specific document ID."""
        print(f"[VectorStore] Deleting points for doc_id '{doc_id}' from Vector DB...")
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="doc_id",
                            match=MatchValue(value=doc_id)
                        )
                    ]
                )
            )
            print(f"[VectorStore] Points for doc_id '{doc_id}' removed.")
            return True
        except Exception as e:
            print(f"[VectorStore Error] Deleting doc_id '{doc_id}' failed: {e}")
            return False

    def clear_collection(self) -> bool:
        """Clears all vector points in the collection."""
        try:
            self.client.delete_collection(self.collection_name)
            self._ensure_collection()
            return True
        except Exception as e:
            print(f"[VectorStore Error] Clearing collection failed: {e}")
            return False

    def search(self, query: str, top_k: int = config.TOP_K, category: str = None) -> List[Dict[str, Any]]:
        """Encodes user query and retrieves top_k vector matches from Qdrant."""
        query_vector = self.embedder.encode(query).tolist()
        
        query_filter = None
        if category and category.lower() != "all":
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="category",
                        match=MatchValue(value=category)
                    )
                ]
            )

        try:
            if hasattr(self.client, "query_points"):
                response = self.client.query_points(
                    collection_name=self.collection_name,
                    query=query_vector,
                    query_filter=query_filter,
                    limit=top_k
                )
                results = response.points
            else:
                results = self.client.search(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    query_filter=query_filter,
                    limit=top_k
                )

            retrieved = []
            for res in results:
                retrieved.append({
                    "score": res.score,
                    "text": res.payload.get("text", ""),
                    "filename": res.payload.get("filename", ""),
                    "doc_id": res.payload.get("doc_id", ""),
                    "category": res.payload.get("category", "")
                })
            return retrieved
        except Exception as e:
            print(f"[VectorStore Warning] Vector search failed ({e}). Returning empty result list.")
            return []

# Singleton instance
vector_store = VectorStore()
