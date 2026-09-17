from typing import List
from app.documents.base import BaseParser, DocumentChunk

class TXTParser(BaseParser):
    def parse(self, file_path: str) -> List[DocumentChunk]:
        chunks = []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
                current_section = None
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    if line.startswith("#"):
                        current_section = line.strip("#").strip()
                        
                    chunks.append(DocumentChunk(
                        text=line,
                        section=current_section
                    ))
            return chunks
        except Exception as e:
            print(f"Error parsing TXT: {e}")
            return []
