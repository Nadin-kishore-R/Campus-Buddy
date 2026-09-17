import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue, MatchAny
from app.config import settings
from app.embeddings.embedding_service import embedding_service

class VectorStoreClient:
    def __init__(self):
        self.collection_name = settings.effective_collection
        
        # Initialize Qdrant Client
        api_key = settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None
        print(f"[QdrantClient] Connecting to {settings.QDRANT_URL}")
        self.client = QdrantClient(url=settings.QDRANT_URL, api_key=api_key)
        
        self._ensure_collection()

    def _ensure_collection(self):
        try:
            collections = [c.name for c in self.client.get_collections().collections]
            if self.collection_name not in collections:
                print(f"[QdrantClient] Creating collection '{self.collection_name}' with dim {embedding_service.dimension}")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=embedding_service.dimension,
                        distance=Distance.COSINE
                    )
                )
        except Exception as e:
            print(f"[QdrantClient Error] Failed to create collection: {e}")

    def upsert_points(self, points: List[tuple]):
        """points is a list of tuples: (id, vector, payload)"""
        qdrant_points = [
            PointStruct(id=str(uuid.uuid4()), vector=vec, payload=payload)
            for _, vec, payload in points
        ]
        self.client.upsert(
            collection_name=self.collection_name,
            points=qdrant_points
        )

    def delete_by_document_id(self, document_id: str):
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=Filter(
                must=[
                    FieldCondition(key="document_id", match=MatchValue(value=document_id))
                ]
            )
        )

    def search(self, query: str, filters: Optional[Filter] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        query_vector = embedding_service.embed_text(query)
        
        try:
            if hasattr(self.client, "query_points"):
                response = self.client.query_points(
                    collection_name=self.collection_name,
                    query=query_vector,
                    query_filter=filters,
                    limit=top_k
                )
                results = response.points
            else:
                results = self.client.search(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    query_filter=filters,
                    limit=top_k
                )
            
            retrieved = []
            for res in results:
                if res.score >= settings.SIMILARITY_THRESHOLD:
                    retrieved.append({
                        "score": res.score,
                        "payload": res.payload
                    })
            return retrieved
        except Exception as e:
            print(f"[QdrantClient Error] Vector search failed ({e}). Returning empty list.")
            return []

qdrant_client = VectorStoreClient()
