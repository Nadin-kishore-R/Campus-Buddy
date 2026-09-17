from typing import List
from app.config import settings
from app.documents.base import DocumentChunk

def split_text_into_chunks(text: str, chunk_size: int = settings.CHUNK_SIZE, chunk_overlap: int = settings.CHUNK_OVERLAP) -> List[str]:
    """Splits text into sliding window chunks with overlap."""
    if not text:
        return []
    
    words = text.split()
    if len(words) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    step = chunk_size - chunk_overlap
    if step <= 0:
        step = chunk_size

    while start < len(words):
        chunk_words = words[start : start + chunk_size]
        chunks.append(" ".join(chunk_words))
        start += step

    return chunks

def chunk_document(doc_chunks: List[DocumentChunk], chunk_size: int = settings.CHUNK_SIZE, chunk_overlap: int = settings.CHUNK_OVERLAP) -> List[DocumentChunk]:
    """Takes initial document chunks (like a page or paragraph) and ensures they fit the chunk_size constraints."""
    final_chunks = []
    for chunk in doc_chunks:
        text_clean = chunk.text.strip() if chunk.text else ""
        if not text_clean:
            continue
            
        words = text_clean.split()
        if len(words) > chunk_size:
            # Sub-chunk this large chunk
            sub_texts = split_text_into_chunks(text_clean, chunk_size, chunk_overlap)
            for sub_text in sub_texts:
                if sub_text.strip():
                    final_chunks.append(DocumentChunk(
                        text=sub_text.strip(),
                        page=chunk.page,
                        section=chunk.section,
                        sheet=chunk.sheet,
                        row=chunk.row
                    ))
        else:
            final_chunks.append(chunk)
                
    return final_chunks
