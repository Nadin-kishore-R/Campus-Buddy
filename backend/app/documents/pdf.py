import fitz  # PyMuPDF
from typing import List
from app.documents.base import BaseParser, DocumentChunk
from app.services.ocr_service import extract_ocr_from_bytes

class PDFParser(BaseParser):
    def parse(self, file_path: str) -> List[DocumentChunk]:
        chunks = []
        try:
            doc = fitz.open(file_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text()
                
                # If page contains no extractable text, attempt OCR on page pixmap
                if not text.strip():
                    pix = page.get_pixmap(dpi=300)
                    img_bytes = pix.tobytes("jpeg")
                    text = extract_ocr_from_bytes(img_bytes)


                if text.strip():
                    chunks.append(DocumentChunk(
                        text=text.strip(),
                        page=page_num + 1
                    ))
            return chunks
        except Exception as e:
            print(f"Error parsing PDF: {e}")
            raise RuntimeError(f"PDF Parsing error: {e}")

    async def parse_async(self, file_path: str, status_updater=None) -> List[DocumentChunk]:
        chunks = []
        try:
            doc = fitz.open(file_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text()
                
                if not text.strip():
                    if status_updater:
                        await status_updater(f"OCR processing page {page_num + 1}/{len(doc)}")
                    
                    # Render high-resolution 300 DPI image for optimal OCR accuracy
                    pix = page.get_pixmap(dpi=300)
                    img_bytes = pix.tobytes("jpeg")
                    text = extract_ocr_from_bytes(img_bytes)


                if text.strip():
                    chunks.append(DocumentChunk(
                        text=text.strip(),
                        page=page_num + 1
                    ))
            return chunks
        except Exception as e:
            print(f"Error parsing PDF async: {e}")
            raise RuntimeError(f"PDF Parsing error: {e}")

