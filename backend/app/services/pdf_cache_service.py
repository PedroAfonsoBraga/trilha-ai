"""
Cache global de PDFs parseados e chunkados.

Responsabilidades:
  - Evitar reprocessamento de PDFs idênticos (mesmo conteúdo de bytes).
  - Armazenar texto_extraido, markdown_text e chunks/embeddings de forma
    compartilhável entre usuários.
  - Invalidar entradas automaticamente quando o modelo de embedding mudar,
    graças à chave composta (file_hash, embedding_model).

Chave de cache:
  - file_hash: sha256 do conteúdo em bytes do arquivo.
  - embedding_model: modelo usado para gerar os embeddings (ex: 'voyage-3').

Uso:
    from app.services.pdf_cache_service import get_cached_document, set_cached_document

    cache_key = hashlib.sha256(file_bytes).hexdigest()
    cached = get_cached_document(cache_key, 'voyage-3')
    if cached:
        # Copiar texto/markdown/chunks para o novo documento
        ...
"""

import hashlib
import logging
import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

from app.services import embedding_service

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_default_model() -> str:
    """Retorna o modelo de embedding ativo (avaliado sob demanda, não na importação)."""
    return embedding_service.get_doc_model()


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def make_file_hash(file_bytes: bytes) -> str:
    """Gera hash SHA-256 determinístico do conteúdo do arquivo."""
    return hashlib.sha256(file_bytes).hexdigest()


def _chunks_to_jsonb(chunks: List[Any], embeddings: Optional[List[List[float]]] = None) -> List[Dict]:
    """Converte objetos Chunk + embeddings em lista serializável para JSONB.

    Args:
        chunks: Lista de objetos Chunk (chunking_service.Chunk) ou dicionários.
        embeddings: Lista opcional de vetores correspondentes.

    Returns:
        Lista de dicionários com index, content, token_count, section, embedding.
    """
    result = []
    for i, chunk in enumerate(chunks):
        # Suporta tanto objetos Chunk quanto dicts
        if hasattr(chunk, "index"):
            chunk_index = chunk.index
            content = chunk.content
            token_count = chunk.token_count
            section = chunk.section if hasattr(chunk, "section") else None
        else:
            chunk_index = chunk.get("chunk_index", i)
            content = chunk.get("content", "")
            token_count = chunk.get("token_count", 0)
            section = chunk.get("section")

        item = {
            "chunk_index": chunk_index,
            "content": content,
            "token_count": token_count,
            "section": section,
        }
        if embeddings and i < len(embeddings):
            item["embedding"] = embeddings[i]
        result.append(item)
    return result


def get_cached_document(
    file_hash: str,
    embedding_model: str = None,
) -> Optional[Dict]:
    """Busca documento parseado/chunkado no cache.

    Args:
        file_hash: Hash SHA-256 do arquivo.
        embedding_model: Modelo de embedding usado nos chunks. Se None, usa o modelo ativo.

    Returns:
        Dicionário com texto_extraido, markdown_text, chunks_jsonb, page_count
        ou None se não houver cache.
    """
    if embedding_model is None:
        embedding_model = _get_default_model()
    supabase = _get_supabase()
    try:
        result = (
            supabase.table("document_hash_cache")
            .select("texto_extraido, markdown_text, chunks_jsonb, page_count")
            .eq("file_hash", file_hash)
            .eq("embedding_model", embedding_model)
            .limit(1)
            .execute()
        )
        if result.data:
            logger.info(
                "Cache hit para PDF hash=%s... model=%s",
                file_hash[:12], embedding_model,
            )
            return result.data[0]
    except Exception as e:
        logger.warning("Erro ao consultar cache de PDF: %s", e)

    return None


def set_cached_document(
    file_hash: str,
    embedding_model: str,
    texto_extraido: Optional[str] = None,
    markdown_text: Optional[str] = None,
    chunks: Optional[List[Any]] = None,
    embeddings: Optional[List[List[float]]] = None,
    page_count: Optional[int] = None,
) -> None:
    """Armazena documento parseado/chunkado no cache.

    Se já existir uma entrada com chunks completos no cache e esta chamada
    não incluir chunks, a entrada existente NÃO é sobrescrita — evita que
    uma escrita parcial (após parsing, antes do embedding) destrua dados
    completos de um upload anterior.

    Args:
        file_hash: Hash SHA-256 do arquivo.
        embedding_model: Modelo de embedding usado nos chunks.
        texto_extraido: Texto puro extraído (PyMuPDF).
        markdown_text: Markdown estruturado (LlamaParse).
        chunks: Lista de chunks (objetos Chunk ou dicts).
        embeddings: Lista de vetores correspondentes aos chunks.
        page_count: Número de páginas estimado.
    """
    supabase = _get_supabase()

    # Se estamos salvando apenas texto (sem chunks), verifica se já existe
    # cache completo para evitar sobrescrever dados de chunk+embedding.
    if not chunks:
        existing = get_cached_document(file_hash, embedding_model)
        if existing and existing.get("chunks_jsonb"):
            chunks_jsonb = existing.get("chunks_jsonb", [])
            if any(c.get("embedding") for c in chunks_jsonb):
                logger.debug(
                    "Cache já completo para hash=%s... model=%s — preservando",
                    file_hash[:12], embedding_model,
                )
                return

    chunks_jsonb = _chunks_to_jsonb(chunks or [], embeddings) if chunks else []

    try:
        supabase.table("document_hash_cache").upsert({
            "file_hash": file_hash,
            "embedding_model": embedding_model,
            "texto_extraido": texto_extraido,
            "markdown_text": markdown_text,
            "chunks_jsonb": chunks_jsonb,
            "page_count": page_count,
        }).execute()
        logger.info(
            "Cache armazenado para PDF hash=%s... model=%s (chunks=%d)",
            file_hash[:12], embedding_model, len(chunks_jsonb),
        )
    except Exception as e:
        logger.warning("Erro ao armazenar cache de PDF: %s", e)


def has_cached_chunks(file_hash: str, embedding_model: str = None) -> bool:
    """Verifica se existe cache com chunks/embeddings para o modelo dado."""
    if embedding_model is None:
        embedding_model = _get_default_model()
    cached = get_cached_document(file_hash, embedding_model)
    if not cached:
        return False
    chunks = cached.get("chunks_jsonb") or []
    return len(chunks) > 0 and any(c.get("embedding") for c in chunks)
