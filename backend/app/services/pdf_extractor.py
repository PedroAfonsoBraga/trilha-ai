"""
Fachada de extracao de texto de PDFs — tenta LlamaParse, fallback PyMuPDF

Esta fachada preserva a assinatura original `extract_text_from_bytes()`
para compatibilidade com todos os callers existentes (routers, chat_service).

Fluxo:
  1. Tenta LlamaParse (Markdown estruturado)
  2. Se falhar (sem API key, timeout, erro), usa PyMuPDF (comportamento original)
  3. Retorna texto puro (extract_text_from_bytes) ou dicionario completo
     (extract_text_from_bytes_with_markdown)
"""

import logging
from typing import Optional

from app.services import _pymupdf_extractor
from app.services.llama_parser import parse_to_markdown

logger = logging.getLogger(__name__)


async def extract_text_from_bytes_with_markdown(
    file_bytes: bytes,
    content_type: str,
    filename: str = "documento.pdf",
) -> dict:
    """Extrai texto com suporte a Markdown estruturado via LlamaParse.

    Args:
        file_bytes: Conteudo do arquivo em bytes.
        content_type: Tipo MIME do arquivo.
        filename: Nome original do arquivo (para o LlamaParse).

    Returns:
        Dicionario com:
            - texto_extraido (str): Texto puro extraido (via PyMuPDF).
            - markdown (str | None): Markdown estruturado (via LlamaParse).
            - page_count (int | None): Numero de paginas estimado.
    """
    # Extrai texto puro sempre — fallback confiavel
    texto_extraido = _pymupdf_extractor.extract_text_from_bytes(file_bytes, content_type)

    markdown = None
    page_count = None

    # Tenta LlamaParse — falha silenciosa (apenas PDFs; DOCX usa PyMuPDF)
    if "pdf" in content_type or (file_bytes[:4] == b"%PDF"):
        try:
            result = await parse_to_markdown(file_bytes, filename)
            markdown = result.get("markdown")
            page_count = result.get("page_count")
        except Exception as e:
            logger.info(
                "LlamaParse nao disponivel para %s: %s — usando PyMuPDF",
                filename, e,
            )

    return {
        "texto_extraido": texto_extraido,
        "markdown": markdown,
        "page_count": page_count,
    }


def extract_text_from_bytes(file_bytes: bytes, content_type: str) -> str:
    """Extrai texto puro de PDF/DOCX (assinatura original, sfncrona).

    Usa apenas PyMuPDF — nao tenta LlamaParse (sincrono).
    Mantida para compatibilidade com callers sincronos.
    """
    return _pymupdf_extractor.extract_text_from_bytes(file_bytes, content_type)
