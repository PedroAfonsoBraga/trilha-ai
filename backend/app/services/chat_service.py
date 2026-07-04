import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, List, Optional

from dotenv import load_dotenv

from app.services.search_service import search_similar_chunks, rerank_chunks
from app.services import chunking_service, embedding_service
from app.services.llm_client import generate_text_stream, DEFAULT_MODEL

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

RAG_SYSTEM_PROMPT_CONCURSO = """Você é o Concurso Assistant do Trilha, um assistente especializado em concursos públicos brasileiros.
Use APENAS o contexto fornecido abaixo (trechos de documentos do usuário) para responder.
Se a informação não estiver no contexto, diga "Não encontrei essa informação nos seus documentos."
NÃO invente informações. Seja conciso e direto.

Contexto dos documentos:
{contexto}"""

RAG_SYSTEM_PROMPT_GENERICO = """Você é o Assistente do Trilha, um assistente especializado em concursos públicos brasileiros e análise de documentos de estudo.
Use APENAS o contexto fornecido abaixo (trechos de documentos do usuário) para responder.
Se a informação não estiver no contexto, diga "Não encontrei essa informação nos seus documentos."
NÃO invente informações. Seja conciso e direto.

Contexto dos documentos:
{contexto}"""


# Cache de tipos de documento por sessão — evita query repetida a cada turno
# Formato: {session_id: ["edital", "pdf_generico", ...]}
_doc_types_cache: Dict[str, List[str]] = {}
_DOC_TYPES_CACHE_MAX = 1000


def _get_supabase():
    from supabase import create_client

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _build_context(chunks: List[Dict]) -> str:
    if not chunks:
        return "Nenhum contexto relevante encontrado."

    parts = []
    for i, chunk in enumerate(chunks):
        doc_id = chunk.get("document_id", "?")[:8]
        parts.append(f"[Documento {doc_id} - Trecho {i + 1}]\n{chunk.get('content', '')}")
    return "\n\n---\n\n".join(parts)


async def _ensure_documents_chunked(
    supabase, document_ids: List[str], user_id: str
) -> int:
    chunks_created = 0

    for doc_id in document_ids:
        existing = (
            supabase.table("document_chunks")
            .select("id", count="exact")
            .eq("document_id", doc_id)
            .eq("user_id", user_id)
            .execute()
        )
        if existing.count and existing.count > 0:
            continue

        doc = (
            supabase.table("documents")
            .select("id, texto_extraido, tipo, metadata, markdown_text")
            .eq("id", doc_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not doc.data:
            continue

        doc_data = doc.data[0]
        metadata = doc_data.get("metadata") or {}

        # Prefere Markdown estruturado (LlamaParse) para chunking
        texto = metadata.get("markdown_text") or doc_data.get("markdown_text") or doc_data.get("texto_extraido")
        if not texto:
            continue

        doc_type = doc_data.get("tipo", "pdf_generico")
        chunks = chunking_service.chunk_by_type(texto, doc_type)
        if not chunks:
            continue

        texts = [c.content for c in chunks]
        doc_model = embedding_service.get_doc_model()
        try:
            embeddings = await embedding_service.gerar_embeddings_batch(texts, input_type="document", model=doc_model)
        except Exception as e:
            logger.error(f"Falha ao gerar embeddings para doc {doc_id}: {e}")
            continue

        for i, chunk in enumerate(chunks):
            if i < len(embeddings):
                supabase.table("document_chunks").insert({
                    "document_id": doc_id,
                    "user_id": user_id,
                    "chunk_index": chunk.index,
                    "content": chunk.content,
                    "token_count": chunk.token_count,
                    "embedding": embeddings[i],
                    "embedding_model": doc_model,
                }).execute()
                chunks_created += 1

    return chunks_created


async def _detect_document_types(
    document_ids: List[str],
    user_id: str,
    session_id: Optional[str] = None,
) -> List[str]:
    """
    Retorna os tipos únicos dos documentos selecionados para o chat.
    Usa cache em memória por session_id para evitar query repetida a cada turno.
    """
    if not document_ids:
        return []

    if session_id and session_id in _doc_types_cache:
        return _doc_types_cache[session_id]

    supabase = _get_supabase()
    try:
        result = (
            supabase.table("documents")
            .select("tipo")
            .in_("id", document_ids)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as e:
        logger.error(f"Falha ao detectar tipos de documentos: {e}")
        return []

    tipos = {doc.get("tipo", "pdf_generico") for doc in (result.data or []) if doc.get("tipo")}
    tipos_list = list(tipos)

    if session_id and len(_doc_types_cache) < _DOC_TYPES_CACHE_MAX:
        _doc_types_cache[session_id] = tipos_list

    return tipos_list


def _select_system_prompt(document_types: List[str]) -> str:
    """
    Seleciona o system prompt adequado com base nos tipos de documento.

    Prioridades:
    1. Edital — usa prompt de concurso público
    2. Genérico — fallback para outros tipos de documento
    """
    if "edital" in document_types:
        return RAG_SYSTEM_PROMPT_CONCURSO
    return RAG_SYSTEM_PROMPT_GENERICO


def _estimar_tokens(texto: str) -> int:
    """Estimativa simples de tokens: palavras * 1.3 (média pt-BR)."""
    return int(len(texto.split()) * 1.3)


async def chat_stream_response(
    messages: List[Dict[str, str]],
    document_ids: List[str],
    user_id: str,
    session_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    supabase = _get_supabase()

    if not session_id:
        result = await asyncio.to_thread(
            lambda: (
                supabase.table("chat_sessions")
                .insert({
                    "user_id": user_id,
                    "document_ids": document_ids,
                    "titulo": messages[0]["content"][:80] if messages else "Nova conversa",
                })
                .execute()
            )
        )
        if not result.data:
            raise ValueError("Falha ao criar sessão de chat")
        session_id = result.data[0]["id"]
    else:
        result = await asyncio.to_thread(
            lambda: (
                supabase.table("chat_sessions")
                .select("*")
                .eq("id", session_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        )
        if not result.data:
            raise ValueError("Sessão não encontrada")

    user_msg = messages[-1]["content"]

    await _ensure_documents_chunked(supabase, document_ids, user_id)

    chunks_raw = []
    try:
        chunks_raw = await search_similar_chunks(
            query=user_msg,
            document_ids=document_ids,
            user_id=user_id,
            top_k=10,
        )
    except Exception as e:
        logger.warning(f"Search similar chunks failed: {e}")

    chunks_reranked = []
    if chunks_raw:
        try:
            chunks_reranked = await rerank_chunks(query=user_msg, chunks=chunks_raw, top_k=5)
        except Exception as e:
            logger.warning(f"Rerank failed: {e}")

    contexto = _build_context(chunks_reranked)

    doc_types = await _detect_document_types(document_ids, user_id, session_id=session_id)
    system_prompt_template = _select_system_prompt(doc_types)
    system_content = system_prompt_template.format(contexto=contexto)

    await asyncio.to_thread(
        lambda: (
            supabase.table("chat_messages")
            .insert({
                "session_id": session_id,
                "user_id": user_id,
                "role": "user",
                "content": user_msg,
                "chunks_citados": [c["id"] for c in chunks_reranked],
            })
            .execute()
        )
    )

    yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"

    full_response = ""
    async for delta in generate_text_stream(
        system_prompt=system_content,
        user_text=user_msg,
        feature="chat",
        model=DEFAULT_MODEL,
        temperature=0.5,
        user_id=user_id,
    ):
        full_response += delta
        yield f"data: {json.dumps({'type': 'chunk', 'content': delta})}\n\n"

    await asyncio.to_thread(
        lambda: (
            supabase.table("chat_messages")
            .insert({
                "session_id": session_id,
                "user_id": user_id,
                "role": "assistant",
                "content": full_response,
                "tokens_used": len(full_response.split()),
                "chunks_citados": [c["id"] for c in chunks_reranked],
            })
            .execute()
        )
    )

    await asyncio.to_thread(
        lambda: (
            supabase.table("chat_sessions")
            .update({
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", session_id)
            .execute()
        )
    )

    yield "data: [DONE]\n\n"


def get_sessions(user_id: str) -> List[Dict]:
    supabase = _get_supabase()
    result = (
        supabase.table("chat_sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data or []


def update_session_title(session_id: str, user_id: str, titulo: str) -> None:
    supabase = _get_supabase()
    result = (
        supabase.table("chat_sessions")
        .update({"titulo": titulo, "updated_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise ValueError("Sessão não encontrada")


def delete_session(session_id: str, user_id: str) -> None:
    supabase = _get_supabase()
    supabase.table("chat_messages").delete().eq("session_id", session_id).eq("user_id", user_id).execute()
    result = (
        supabase.table("chat_sessions")
        .delete()
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise ValueError("Sessão não encontrada")


def get_session_messages(session_id: str, user_id: str) -> List[Dict]:
    supabase = _get_supabase()
    result = (
        supabase.table("chat_messages")
        .select("*")
        .eq("session_id", session_id)
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    return result.data or []
