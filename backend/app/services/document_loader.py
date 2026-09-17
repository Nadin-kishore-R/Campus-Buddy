import os
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader
import config

import fitz  # PyMuPDF
from app.services.ocr_service import extract_ocr_from_bytes, extract_ocr_from_file

def load_text_file(filepath: Path) -> str:
    """Reads content from plain text or markdown files."""
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception as e:
        print(f"[Warning] Failed to read {filepath}: {e}")
        return ""

def load_pdf_file(filepath: Path) -> str:
    """Extracts text content from a PDF file using PyMuPDF and OCR for scanned pages."""
    text = ""
    try:
        doc = fitz.open(str(filepath))
        for page_idx, page in enumerate(doc):
            page_text = page.get_text()
            if not page_text.strip():
                # Perform 300 DPI OCR on page pixmap
                pix = page.get_pixmap(dpi=300)
                page_text = extract_ocr_from_bytes(pix.tobytes("jpeg"))

            if page_text.strip():
                text += f"\n--- Page {page_idx + 1} ---\n" + page_text.strip()
    except Exception as e:
        print(f"[Warning] Failed to extract text from PDF {filepath}: {e}")
    return text

def split_text_into_chunks(text: str, chunk_size: int = config.CHUNK_SIZE, chunk_overlap: int = config.CHUNK_OVERLAP) -> List[str]:
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

def process_file_into_chunks(filepath: Path, doc_id: str, filename: str, category: str = "General") -> List[Dict[str, Any]]:
    """Loads a single file (PDF/TXT/MD/PNG/JPG), chunks it, and attaches metadata for vector indexing."""
    ext = filepath.suffix.lower()
    content = ""

    if ext == ".pdf":
        content = load_pdf_file(filepath)
    elif ext in [".txt", ".md", ".json", ".csv"]:
        content = load_text_file(filepath)
    elif ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        content = extract_ocr_from_file(str(filepath))


    if not content.strip():
        return []

    chunks = split_text_into_chunks(content)
    records = []

    for idx, chunk_text in enumerate(chunks):
        records.append({
            "chunk_id": f"{doc_id}_chunk_{idx}",
            "doc_id": doc_id,
            "text": chunk_text,
            "filename": filename,
            "category": category,
            "chunk_index": idx
        })

    print(f"[DocumentLoader] Generated {len(records)} chunks for document '{filename}' (ID: {doc_id})")
    return records
