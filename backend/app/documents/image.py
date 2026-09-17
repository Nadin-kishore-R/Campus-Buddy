from typing import List
from app.documents.base import BaseParser, DocumentChunk
from app.services.ocr_service import extract_ocr_from_file

class ImageParser(BaseParser):
    def parse(self, file_path: str) -> List[DocumentChunk]:
        text = extract_ocr_from_file(file_path)
        if text.strip():
            return [DocumentChunk(text=text.strip())]
        return []

    async def parse_async(self, file_path: str, status_updater=None) -> List[DocumentChunk]:
        if status_updater:
            await status_updater("Performing OCR on image file...")
        return self.parse(file_path)
