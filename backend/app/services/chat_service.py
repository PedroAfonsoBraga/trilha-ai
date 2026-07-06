import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, List, Optional

from dotenv import load_dotenv

from app.services.search_service import search_hybrid_chunks, merge_rrf_results, rerank_chunks
from app.services import chunking_service, embedding_service, query_rewriter
from app.services.llm_client import generate_text_stream, DEFAULT_MODEL

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

RAG_SYSTEM_PROMPT_CONCURSO = """Você é o Concurso Assistant do Trilha, um assistente especializado em concursos públicos brasileiros.
Responda com base APENAS nos trechos dos documentos fornecidos abaixo.
Seja conciso, direto e cite o trecho relevante quando possível.
Se não houver menção explícita ao que foi perguntado, diga claramente que não encontrou menção explícita e, em seguida, resuma o que o documento cobre nos trechos disponíveis.
NÃO invente informações.

Contexto dos documentos:
{contexto}"""

RAG_SYSTEM_PROMPT_GENERICO = """Você é o Assistente do Trilha, um assistente especializado em análise de documentos de estudo.
Responda com base APENAS nos trechos dos documentos fornecidos abaixo.
Seja conciso, direto e cite o trecho relevante quando possível.
Se não houver menção explícita ao que foi perguntado, diga claramente que não encontrou menção explícita e, em seguida, resuma o que o documento cobre nos trechos disponíveis.
NÃO invente informações.

Contexto dos documentos:
{contexto}"""


# Cache de tipos/títulos de documento por sessão — evita query repetida a cada turno
# Formato: {session_id: {"types": [...], "titles": {doc_id: nome}}}
_doc_meta_cache: Dict[str, Dict] = {}
_DOC_META_CACHE_MAX = 1000


def _get_supabase():
    from supabase import create_client

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _format_history(messages: List[Dict[str, str]]) -> str:
    """Formata as últimas mensagens para o prompt do LLM."""
    if not messages:
        return ""
    lines = ["Histórico da conversa:"]
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if not content:
            continue
        label = "Usuário" if role == "user" else "Assistente"
        lines.append(f"{label}: {content}")
    return "\n".join(lines)


def _build_context(chunks: List[Dict], doc_titles: Dict[str, str]) -> str:
    if not chunks:
        return "Nenhum contexto relevante encontrado nos documentos selecionados."

    parts = []
    for i, chunk in enumerate(chunks):
        doc_id = chunk.get("document_id", "?")
        doc_label = doc_titles.get(doc_id, f"Documento {str(doc_id)[:8]}")
        section = chunk.get("section")
        section_label = f" | Seção: {section}" if section else ""
        parts.append(
            f"[Fonte {i + 1}: {doc_label}{section_label}]\n{chunk.get('content', '')}"
        )
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
            .select("id, texto_extraido, tipo, metadata, markdown_text, nome_original")
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
                    "section": chunk.section,
                    "token_count": chunk.token_count,
                    "embedding": embeddings[i],
                    "embedding_model": doc_model,
                }).execute()
                chunks_created += 1

    return chunks_created


async def _load_document_meta(
    document_ids: List[str],
    user_id: str,
    session_id: Optional[str] = None,
) -> Dict[str, Dict]:
    """Carrega tipos e títulos dos documentos, com cache por sessão."""
    if not document_ids:
        return {"types": [], "titles": {}}

    if session_id and session_id in _doc_meta_cache:
        cached = _doc_meta_cache[session_id]
        # Verifica se todos os documentos estão no cache
        if all(doc_id in cached.get("titles", {}) for doc_id in document_ids):
            return cached

    supabase = _get_supabase()
    try:
        result = (
            supabase.table("documents")
            .select("id, tipo, nome_original")
            .in_("id", document_ids)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as e:
        logger.error(f"Falha ao carregar metadados dos documentos: {e}")
        return {"types": [], "titles": {doc_id: f"Documento {doc_id[:8]}" for doc_id in document_ids}}

    types = []
    titles = {}
    for doc in result.data or []:
        tipo = doc.get("tipo", "pdf_generico")
        if tipo:
            types.append(tipo)
        titles[doc["id"]] = doc.get("nome_original") or f"Documento {str(doc['id'])[:8]}"

    meta = {"types": types, "titles": titles}

    if session_id and len(_doc_meta_cache) < _DOC_META_CACHE_MAX:
        _doc_meta_cache[session_id] = meta

    return meta


def _select_system_prompt(document_types: List[str]) -> str:
    """Seleciona o system prompt adequado com base nos tipos de documento."""
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
    history = messages[:-1] if len(messages) > 1 else []

    # Garante chunks para documentos ainda não indexados
    await _ensure_documents_chunked(supabase, document_ids, user_id)

    # Carrega metadados (tipos + títulos) para prompt e contexto
    doc_meta = await _load_document_meta(document_ids, user_id, session_id=session_id)

    # Rewriting da query: coloquial -> formal + keywords
    rewritten = {"queries": [user_msg], "keywords": []}
    try:
        rewritten = await query_rewriter.rewrite_query(
            query=user_msg,
            history=history,
            user_id=user_id,
        )
    except Exception as e:
        logger.warning("Query rewrite falhou, usando query original: %s", e)

    # Busca híbrida para cada variante de query e funde via RRF
    chunk_lists = []
    for variant in rewritten["queries"]:
        try:
            chunks = await search_hybrid_chunks(
                query=variant,
                document_ids=document_ids,
                user_id=user_id,
                top_k=20,
                keywords=rewritten["keywords"],
            )
            if chunks:
                chunk_lists.append(chunks)
        except Exception as e:
            logger.warning("Busca híbrida falhou para variante '%s': %s", variant, e)

    merged_chunks = merge_rrf_results(chunk_lists) if chunk_lists else []

    # Rerank final
    chunks_reranked = []
    if merged_chunks:
        try:
            chunks_reranked = await rerank_chunks(
                query=user_msg,
                chunks=merged_chunks,
                top_k=8,
                user_id=user_id,
            )
        except Exception as e:
            logger.warning("Rerank final falhou: %s", e)
            chunks_reranked = merged_chunks[:8]

    contexto = _build_context(chunks_reranked, doc_titles=doc_meta.get("titles", {}))

    system_prompt_template = _select_system_prompt(doc_meta.get("types", []))
    system_content = system_prompt_template.format(contexto=contexto)

    # Monta user_text com histórico + pergunta atual
    history_text = _format_history(history)
    user_text = f"{history_text}\n\nPergunta atual: {user_msg}".strip()

    # Logging de retrieval para observabilidade
    logger.info(
        "Chat retrieval session=%s query=%r variants=%s keywords=%s merged=%d reranked=%d",
        session_id[:8] if session_id else None,
        user_msg,
        rewritten["queries"],
        rewritten["keywords"],
        len(merged_chunks),
        len(chunks_reranked),
    )
    for i, chunk in enumerate(chunks_reranked[:5]):
        logger.info(
            "Top chunk %d: id=%s sim=%.3f rrf=%.3f lexical_rank=%s",
            i + 1,
            str(chunk.get("id"))[:8],
            chunk.get("similarity", 0),
            chunk.get("rrf_score", 0),
            chunk.get("lexical_rank"),
        )

    # Persiste mensagem do usuário
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
        user_text=user_text,
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
