"""
Worker de processamento assíncrono de uploads.

Responsabilidades:
  - Executar o pipeline de upload em background (parse -> chunk -> embed -> upsert).
  - Atualizar o status do job em cada estágio para consumo via SSE.
  - Reaproveitar o cache por hash (pdf_cache_service) sempre que possível.
  - Garantir que falhas em qualquer estágio marquem o job como 'failed'.

O worker é iniciado pelo endpoint POST /api/documents/upload com
asyncio.create_task(). Ele recebe os bytes do arquivo em memória —
essa escolha simplifica a Fase 4; a retomada após restart é tratada
na Fase 6 (marcar jobs órfãos como failed + retry manual).
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

from dotenv import load_dotenv

from app.services import (
    pdf_extractor,
    chunking_service,
    pdf_cache_service,
    embedding_service,
)

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Progresso alocado por estágio (percentual aproximado)
STAGE_PROGRESS = {
    "queued": 0,
    "parsing": 15,
    "chunking": 40,
    "embedding": 65,
    "upsert": 85,
    "done": 100,
}


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _update_job(
    supabase,
    job_id: str,
    status: Optional[str] = None,
    stage: Optional[str] = None,
    progress: Optional[int] = None,
    error_msg: Optional[str] = None,
) -> None:
    """Atualiza campos do job de forma atômica."""
    data: Dict[str, any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if status is not None:
        data["status"] = status
    if stage is not None:
        data["stage"] = stage
        data["progress"] = STAGE_PROGRESS.get(stage, data.get("progress", 0))
    if progress is not None:
        data["progress"] = progress
    if error_msg is not None:
        data["error_msg"] = error_msg

    try:
        supabase.table("upload_jobs").update(data).eq("id", job_id).execute()
    except Exception as e:
        logger.warning("Falha ao atualizar job %s: %s", job_id, e)


def _friendly_error(stage: str, raw_error: str) -> str:
    """Converte mensagens técnicas em mensagens amigáveis para o usuário."""
    known_errors = {
        "VOYAGE_API_KEY não configurada": "Serviço de indexação temporariamente indisponível. Tente novamente em alguns minutos.",
        "name 'embedding_service' is not defined": "Erro interno ao processar o documento. Nossa equipe foi notificada.",
        "401": "Falha de autenticação com o serviço de IA. Tente novamente.",
        "429": "Muitas requisições ao serviço de IA. Aguarde alguns segundos e tente novamente.",
    }

    for tech_pattern, friendly in known_errors.items():
        if tech_pattern in raw_error:
            return friendly

    stage_fallbacks = {
        "parsing": "Não foi possível extrair o texto do PDF. Verifique se o arquivo não está corrompido.",
        "chunking": "Erro ao dividir o texto em partes para indexação.",
        "embedding": "Erro ao indexar o documento para busca. Tente novamente.",
        "upsert": "Erro ao salvar o documento processado. Tente novamente.",
    }

    return stage_fallbacks.get(stage, "Erro ao processar o documento. Tente novamente.")


def _fail_job(supabase, job_id: str, error_msg: str, stage: str = "unknown") -> None:
    """Marca job como falho e registra mensagem de erro.

    O erro técnico vai para o log do servidor (acessível via Sentry).
    O error_msg no banco é convertido para mensagem amigável ao usuário.
    """
    logger.error("Upload job %s falhou no estágio '%s': %s", job_id, stage, error_msg)
    friendly_msg = _friendly_error(stage, error_msg)
    _update_job(supabase, job_id, status="failed", stage=stage, error_msg=friendly_msg)


def _insert_chunks(supabase, doc_id: str, user_id: str, chunks: List[chunking_service.Chunk], embeddings: List[List[float]], embedding_model: str) -> int:
    """Remove chunks antigos e insere novos chunks com embeddings usando batch insert."""
    supabase.table("document_chunks").delete().eq("document_id", doc_id).eq("user_id", user_id).execute()

    chunks_to_insert = []
    for i, chunk in enumerate(chunks):
        if i >= len(embeddings):
            continue
        chunks_to_insert.append({
            "document_id": doc_id,
            "user_id": user_id,
            "chunk_index": chunk.index,
            "content": chunk.content,
            "token_count": chunk.token_count,
            "embedding": embeddings[i],
            "embedding_model": embedding_model,
        })

    if not chunks_to_insert:
        return 0

    supabase.table("document_chunks").insert(chunks_to_insert).execute()
    return len(chunks_to_insert)


async def run_upload_job(
    job_id: str,
    doc_id: str,
    user_id: str,
    file_bytes: bytes,
    content_type: str,
    filename: str,
    tipo: str,
    embedding_model: str,
) -> None:
    """Executa o pipeline completo de upload em background.

    Args:
        job_id: ID do job na tabela upload_jobs.
        doc_id: ID do documento já criado (parcialmente).
        user_id: ID do usuário dono do documento.
        file_bytes: Conteúdo do arquivo em bytes.
        content_type: MIME type do arquivo.
        filename: Nome original do arquivo.
        tipo: Tipo do documento ('edital' ou 'pdf_generico').
        embedding_model: Modelo de embedding usado para gerar os vetores.
    """
    supabase = _get_supabase()

    try:
        file_hash = pdf_cache_service.make_file_hash(file_bytes)
    except Exception as e:
        logger.exception("Job %s: falha ao calcular hash do arquivo", job_id)
        _fail_job(supabase, job_id, f"Erro inesperado: {e}", stage="parsing")
        return

    # Top-level try/except para capturar exceções não tratadas pelos estágios internos
    try:
        await _run_upload_pipeline(
            supabase=supabase,
            job_id=job_id,
            doc_id=doc_id,
            user_id=user_id,
            file_bytes=file_bytes,
            content_type=content_type,
            filename=filename,
            tipo=tipo,
            embedding_model=embedding_model,
            file_hash=file_hash,
        )
    except Exception as e:
        logger.exception("Job %s: falha inesperada no pipeline", job_id)
        _fail_job(supabase, job_id, "Erro interno inesperado. Nossa equipe foi notificada.", stage="unknown")


async def _run_upload_pipeline(
    supabase,
    job_id: str,
    doc_id: str,
    user_id: str,
    file_bytes: bytes,
    content_type: str,
    filename: str,
    tipo: str,
    embedding_model: str,
    file_hash: str,
) -> None:
    """Pipeline interno de upload (extraída para permitir try/except de topo)."""
    _update_job(supabase, job_id, status="processing", stage="parsing")

    # ========================================================================
    # Estágio 1: Parsing (LlamaParse / PyMuPDF)
    # ========================================================================
    texto_extraido = None
    markdown_text = None
    page_count = None
    cached = None

    try:
        cached = pdf_cache_service.get_cached_document(file_hash, embedding_model)
        if cached:
            logger.info("Job %s: cache hit no parsing", job_id)
            texto_extraido = cached.get("texto_extraido")
            markdown_text = cached.get("markdown_text")
            page_count = cached.get("page_count")
        else:
            result = await pdf_extractor.extract_text_from_bytes_with_markdown(
                file_bytes, content_type, filename=filename or "documento.pdf",
            )
            texto_extraido = result.get("texto_extraido")
            markdown_text = result.get("markdown")
            page_count = result.get("page_count")
    except Exception as e:
        logger.exception("Job %s: falha no parsing", job_id)
        _fail_job(supabase, job_id, f"Falha na extração de texto: {e}", stage="parsing")
        return

    # Verifica se o documento ainda existe (pode ter sido deletado durante o parsing)
    doc_check = (
        supabase.table("documents")
        .select("id")
        .eq("id", doc_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not doc_check.data:
        _fail_job(supabase, job_id, "Documento foi deletado durante o processamento", stage="parsing")
        return

    # Atualiza documento com texto extraído
    metadata: Dict[str, any] = {
        "nome_original": filename,
        "tamanho_bytes": len(file_bytes),
        "file_hash": file_hash,
    }
    if markdown_text:
        metadata["markdown_text"] = markdown_text
        metadata["page_count"] = page_count

    try:
        supabase.table("documents").update({
            "texto_extraido": texto_extraido,
            "markdown_text": markdown_text,
            "metadata": metadata,
        }).eq("id", doc_id).eq("user_id", user_id).execute()
    except Exception as e:
        logger.exception("Job %s: falha ao atualizar documento no banco", job_id)
        _fail_job(supabase, job_id, f"Falha ao atualizar documento: {e}", stage="parsing")
        return

    # Salva parse no cache (se ainda não estava)
    if not cached:
        pdf_cache_service.set_cached_document(
            file_hash=file_hash,
            embedding_model=embedding_model,
            texto_extraido=texto_extraido,
            markdown_text=markdown_text,
            page_count=page_count,
        )

    # ========================================================================
    # Estágio 2: Chunking
    # ========================================================================
    _update_job(supabase, job_id, stage="chunking")

    texto_para_chunk = markdown_text or texto_extraido
    if not texto_para_chunk:
        _fail_job(supabase, job_id, "Documento sem texto extraído", stage="chunking")
        return

    try:
        chunks = chunking_service.chunk_by_type(texto_para_chunk, tipo)
        if not chunks:
            _fail_job(supabase, job_id, "Não foi possível gerar chunks", stage="chunking")
            return
    except Exception as e:
        logger.exception("Job %s: falha no chunking", job_id)
        _fail_job(supabase, job_id, f"Falha no chunking: {e}", stage="chunking")
        return

    # ========================================================================
    # Estágio 3: Embedding
    # ========================================================================
    _update_job(supabase, job_id, stage="embedding")

    texts = [c.content for c in chunks]
    try:
        embeddings = await embedding_service.gerar_embeddings_batch(
            texts, input_type="document", model=embedding_model
        )
    except Exception as e:
        logger.exception("Job %s: falha ao gerar embeddings", job_id)
        _fail_job(supabase, job_id, f"Falha ao gerar embeddings: {e}", stage="embedding")
        return

    # ========================================================================
    # Estágio 4: Upsert
    # ========================================================================
    _update_job(supabase, job_id, stage="upsert")

    try:
        inserted = _insert_chunks(supabase, doc_id, user_id, chunks, embeddings, embedding_model)
        logger.info("Job %s: %d chunks inseridos para doc=%s", job_id, inserted, doc_id[:8])
    except Exception as e:
        logger.exception("Job %s: falha ao inserir chunks no banco", job_id)
        _fail_job(supabase, job_id, f"Falha ao inserir chunks: {e}", stage="upsert")
        return

    # Salva chunks+embeddings no cache
    pdf_cache_service.set_cached_document(
        file_hash=file_hash,
        embedding_model=embedding_model,
        texto_extraido=texto_extraido,
        markdown_text=markdown_text,
        chunks=chunks,
        embeddings=embeddings,
        page_count=page_count,
    )

    _update_job(supabase, job_id, status="done", stage="done", progress=100)
