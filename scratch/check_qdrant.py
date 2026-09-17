from app.vector.qdrant_client import qdrant_client
from qdrant_client.models import Filter, FieldCondition, MatchValue

res, _ = qdrant_client.client.scroll(
    collection_name=qdrant_client.collection_name,
    scroll_filter=Filter(must=[FieldCondition(key='filename', match=MatchValue(value='R2025_AD.pdf'))]),
    limit=10
)

print(f"Total points retrieved for R2025_AD.pdf: {len(res)}")
for i, point in enumerate(res):
    page = point.payload.get("page", "?")
    text = point.payload.get("chunk_text", "")
    print(f"--- Chunk {i+1} (Page {page}) ---")
    print(text[:300])
    print()
