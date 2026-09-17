import os
from typing import Optional
from app.documents.base import BaseParser
from app.documents.pdf import PDFParser
from app.documents.docx import DOCXParser
from app.documents.xlsx import XLSXParser
from app.documents.csv import CSVParser
from app.documents.txt import TXTParser
from app.documents.image import ImageParser

def get_parser(filename: str) -> Optional[BaseParser]:
    _, ext = os.path.splitext(filename)
    ext = ext.lower()
    
    if ext == ".pdf":
        return PDFParser()
    elif ext in [".docx", ".doc"]:
        return DOCXParser()
    elif ext in [".xlsx", ".xls"]:
        return XLSXParser()
    elif ext == ".csv":
        return CSVParser()
    elif ext in [".txt", ".md"]:
        return TXTParser()
    elif ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        return ImageParser()
    
    return None

