"""
Integracao com LlamaParse — extracao de Markdown estruturado de PDFs

Responsabilidades:
  - Receber bytes de PDF/DOCX e extrair texto em Markdown estruturado
  - Usar LlamaCloud API com configuracao otimizada para portugues
  - Fallback silencioso: se LLAMA_CLOUD_API_KEY ausente ou API falha,
    levanta excecao para que o pdf_extractor fachada use PyMuPDF

Uso:
    from app.services.llama_parser import parse_to_markdown

    result = await parse_to_markdown(file_bytes, "edital_tjba.pdf")
    markdown = result["markdown"]
    page_count = result["page_count"]
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

LLAMA_CLOUD_API_KEY = os.getenv("LLAMA_CLOUD_API_KEY", "")

# Timeout generoso para PDFs grandes (ate 300s = 5min)
LLAMA_TIMEOUT_SECONDS = 300


async def parse_to_markdown(
    file_bytes: bytes,
    filename: str,
) -> dict:
    """Extrai Markdown estruturado de um PDF via LlamaParse.

    Args:
        file_bytes: Conteudo do arquivo em bytes.
        filename: Nome original do arquivo (para deteccao de tipo).

    Returns:
        Dicionario com:
            - markdown (str): Texto extraido em formato Markdown.
            - page_count (int): Numero de paginas detectado.
            - parsed_at (str): Timestamp ISO da extracao.

    Raises:
        RuntimeError: Se LLAMA_CLOUD_API_KEY nao estiver configurada.
        ValueError: Se o arquivo for invalido ou corrompido.
        TimeoutError: Se a API exceder o tempo limite apos retry.
        Exception: Para outros erros da API LlamaParse.
    """
    if not LLAMA_CLOUD_API_KEY:
        logger.warning("[MOCK] LLAMA_CLOUD_API_KEY nao configurada — fallback PyMuPDF")
        raise RuntimeError("LLAMA_CLOUD_API_KEY nao configurada")

    try:
        from llama_parse import LlamaParse

        parser = LlamaParse(
            api_key=LLAMA_CLOUD_API_KEY,
            result_type="markdown",
            language="pt",
            verbose=False,
            show_progress=False,
        )

        # LlamaParse aceita file_path ou file_bytes como objeto file-like
        # Usamos o nome do arquivo para que o parser detecte o formato
        import tempfile

        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            documents = await asyncio.wait_for(
                parser.aload_data(tmp_path),
                timeout=LLAMA_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            logger.warning("LlamaParse timeout apos %ds para %s", LLAMA_TIMEOUT_SECONDS, filename)
            raise TimeoutError(f"LlamaParse timeout apos {LLAMA_TIMEOUT_SECONDS}s")
        finally:
            # Limpa o arquivo temporario
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

        if not documents:
            raise ValueError("LlamaParse retornou documento vazio")

        # LlamaIndex Document objects usam .text como atributo principal
        # (NÃO .text_content — erro comum de migracao de versoes)
        full_markdown = "\n\n".join(
            doc.text for doc in documents if doc.text
        )

        if not full_markdown.strip():
            raise ValueError("LlamaParse retornou Markdown vazio")

        # Estima page_count a partir do metadata se disponivel
        # O metadata contem informacoes do parser como page_count, file_name, etc.
        page_count = None
        if documents and hasattr(documents[0], "metadata") and documents[0].metadata:
            page_count = documents[0].metadata.get("page_count") or documents[0].metadata.get("pages")

        logger.info(
            "LlamaParse OK: %s — %d chars, page_count=%s",
            filename, len(full_markdown), page_count,
        )

        return {
            "markdown": full_markdown,
            "page_count": page_count,
            "parsed_at": datetime.now(timezone.utc).isoformat(),
        }

    except RuntimeError:
        raise
    except ValueError:
        raise
    except TimeoutError:
        raise
    except Exception as e:
        error_msg = str(e)
        # Timeout da lib pode vir como tuple (timeout,)
        if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
            logger.warning("LlamaParse timeout para %s — 1 retry", filename)
            raise TimeoutError(f"LlamaParse timeout: {error_msg}")
        logger.error("LlamaParse falhou para %s: %s", filename, error_msg)
        raise
