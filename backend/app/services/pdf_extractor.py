import io
import logging
from typing import Optional

import fitz  # PyMuPDF
import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    full_text = ""

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()

        if text.strip():
            full_text += f"\n--- Página {page_num + 1} ---\n{text}"
        else:
            ocr_text = _ocr_page(page)
            if ocr_text:
                full_text += f"\n--- Página {page_num + 1} (OCR) ---\n{ocr_text}"

    doc.close()
    return full_text.strip()


def _ocr_page(page: fitz.Page) -> Optional[str]:
    try:
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        return pytesseract.image_to_string(img, lang="por")
    except Exception as e:
        logger.warning(f"OCR failed on page: {e}")
        return None
