import uuid
from typing import Dict, Any
from app.vector.qdrant_client import qdrant_client
from app.embeddings.embedding_service import embedding_service
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue

async def sync_entity_to_qdrant(entity_type: str, entity_id: str, data: Dict[str, Any]):
    """
    Syncs a MongoDB entity (department, club, transport, event) to Qdrant.
    """
    # First, delete existing point for this entity
    try:
        qdrant_client.client.delete(
            collection_name=qdrant_client.collection_name,
            points_selector=Filter(
                must=[
                    FieldCondition(key="entity_id", match=MatchValue(value=entity_id)),
                    FieldCondition(key="entity_type", match=MatchValue(value=entity_type))
                ]
            )
        )
    except Exception as e:
        print(f"[Sync] Warning: Failed to delete existing points for {entity_type} {entity_id}: {e}")

    if not data.get("active", True):
        return  # Do not index inactive entities

    # Build the text representation
    text_parts = []
    text_parts.append(f"Type: {entity_type.capitalize()}")
    
    if entity_type == "department":
        text_parts.append(f"Department Name: {data.get('name')}")
        text_parts.append(f"Code: {data.get('code')}")
        text_parts.append(f"HOD: {data.get('hod')}")
        text_parts.append(f"Location: {data.get('location')}")
        text_parts.append(f"Description: {data.get('description')}")
        
    elif entity_type == "club":
        text_parts.append(f"Club Name: {data.get('name')}")
        text_parts.append(f"Category: {data.get('category')}")
        text_parts.append(f"Faculty In-charge: {data.get('faculty_incharge')}")
        text_parts.append(f"Student Lead: {data.get('student_lead')}")
        text_parts.append(f"Description: {data.get('description')}")
        
    elif entity_type == "transport":
        text_parts.append(f"Bus Route Number: {data.get('route_number')}")
        text_parts.append(f"Driver Name: {data.get('driver_name')}")
        text_parts.append(f"Driver Contact: {data.get('driver_contact')}")
        text_parts.append(f"Departure Time: {data.get('departure_time')}")
        if data.get("stops"):
            text_parts.append("Stops:")
            for stop in data.get("stops"):
                text_parts.append(f"- {stop.get('name')} at {stop.get('time')}")
                
    elif entity_type == "campus_data":
        text_parts.append(f"Title: {data.get('title')}")
        text_parts.append(f"Category: {data.get('category')}")
        text_parts.append(f"Content: {data.get('content')}")
        if data.get("tags"):
            text_parts.append(f"Tags: {', '.join(data.get('tags'))}")

    elif entity_type == "event":
        text_parts.append(f"Event Title: {data.get('title')}")
        text_parts.append(f"Description: {data.get('description')}")
        text_parts.append(f"Date: {data.get('date')}")
        text_parts.append(f"Coordinator: {data.get('coordinator')}")
        text_parts.append(f"Email: {data.get('email')}")
        text_parts.append(f"Phone: {data.get('phone')}")

    chunk_text = "\n".join(text_parts)
    
    # Generate embedding
    vector = embedding_service.embed_text(chunk_text)
    
    # Build payload
    payload = {
        "entity_id": entity_id,
        "entity_type": entity_type,
        "filename": f"{entity_type.capitalize()}: {data.get('name') or data.get('route_number') or data.get('title')}",
        "chunk_text": chunk_text,
        "access_level": "public",  # Campus info is generally public
        "active": True
    }
    
    # Include event-specific URLs in the payload so the UI can render them
    if entity_type == "event":
        if data.get("poster_url"):
            payload["poster_url"] = data.get("poster_url")
        if data.get("registration_link"):
            payload["registration_link"] = data.get("registration_link")
            
    # Upsert
    point = PointStruct(id=str(uuid.uuid4()), vector=vector, payload=payload)
    qdrant_client.client.upsert(
        collection_name=qdrant_client.collection_name,
        points=[point]
    )

async def delete_entity_from_qdrant(entity_type: str, entity_id: str):
    try:
        qdrant_client.client.delete(
            collection_name=qdrant_client.collection_name,
            points_selector=Filter(
                must=[
                    FieldCondition(key="entity_id", match=MatchValue(value=entity_id)),
                    FieldCondition(key="entity_type", match=MatchValue(value=entity_type))
                ]
            )
        )
    except Exception as e:
        print(f"[Sync] Warning: Failed to delete existing points for {entity_type} {entity_id}: {e}")
