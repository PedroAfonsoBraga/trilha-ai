"""
Extracao de texto de PDFs usando PyMuPDF (fitz) com fallback OCR (pytesseract)

Este modulo foi preservado do pdf_extractor.py original apos a migracao
para LlamaParse. Ele serve como fallback quando:
  - LLAMA_CLOUD_API_KEY nao esta configurada
  - A API LlamaParse falha ou retorna timeout
  - O documento nao e suportado pelo LlamaParse

Nao deve ser importado diretamente por servicos externos.
Use `pdf_extractor.extract_text_from_bytes()` (a fachada publica).
"""

import io
import logging
from typing import Optional

import fitz  # PyMuPDF
import pytesseract
from docx import Document as DocxDocument
from PIL import Image

logger = logging.getLogger(__name__)


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extrai texto de PDF bytes usando PyMuPDF + OCR fallback por pagina."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    full_text = ""

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()

        if text.strip():
            full_text += f"\n--- Pagina {page_num + 1} ---\n{text}"
        else:
            ocr_text = _ocr_page(page)
            if ocr_text:
                full_text += f"\n--- Pagina {page_num + 1} (OCR) ---\n{ocr_text}"

    doc.close()
    return full_text.strip()


def extract_text_from_docx_bytes(docx_bytes: bytes) -> str:
    """Extrai texto de DOCX bytes usando python-docx."""
    doc = DocxDocument(io.BytesIO(docx_bytes))
    paragraphs = []
    for para in doc.paragraphs:
        if para.text.strip():
            paragraphs.append(para.text)
    return "\n".join(paragraphs)


def extract_text_from_bytes(file_bytes: bytes, content_type: str) -> str:
    """Dispatcher: roteia para extrator de PDF ou DOCX conforme o tipo."""
    if "pdf" in content_type or (file_bytes[:4] == b"%PDF"):
        return extract_text_from_pdf_bytes(file_bytes)
    elif "word" in content_type or "docx" in content_type or (
        file_bytes[:2] == b"PK" and b"word/" in file_bytes[:500]
    ):
        return extract_text_from_docx_bytes(file_bytes)
    else:
        raise ValueError(f"Formato de arquivo nao suportado: {content_type}")


def _ocr_page(page: fitz.Page) -> Optional[str]:
    """Executa OCR em uma pagina do PDF usando Tesseract (lang=por)."""
    try:
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        return pytesseract.image_to_string(img, lang="por")
    except Exception as e:
        logger.warning(f"OCR falhou na pagina: {e}")
        return None
