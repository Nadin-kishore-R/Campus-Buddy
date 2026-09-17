import pandas as pd
from typing import List
from app.documents.base import BaseParser, DocumentChunk

class CSVParser(BaseParser):
    def parse(self, file_path: str) -> List[DocumentChunk]:
        chunks = []
        try:
            df = pd.read_csv(file_path)
            for row_idx, row in df.iterrows():
                row_data = []
                for col_name, value in row.items():
                    if pd.notna(value):
                        row_data.append(f"{col_name}={value}")
                
                if row_data:
                    text = f"Row {row_idx + 1}: " + ", ".join(row_data)
                    chunks.append(DocumentChunk(
                        text=text,
                        row=row_idx + 1
                    ))
            return chunks
        except Exception as e:
            print(f"Error parsing CSV: {e}")
            return []
