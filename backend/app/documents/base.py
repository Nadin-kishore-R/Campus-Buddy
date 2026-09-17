from typing import List, Optional
from pydantic import BaseModel

class DocumentChunk(BaseModel):
    text: str
    page: Optional[int] = None
    section: Optional[str] = None
    sheet: Optional[str] = None
    row: Optional[int] = None

class BaseParser:
    def parse(self, file_path: str) -> List[DocumentChunk]:
        raise NotImplementedError("Subclasses must implement parse()")
        
    async def parse_async(self, file_path: str, status_updater=None) -> List[DocumentChunk]:
        return self.parse(file_path)
