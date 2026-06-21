import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx

from app.services.search_service import search_similar_chunks, rerank_chunks

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEFAULT_MODEL = "deepseek-v4-flash"

RAG_SYSTEM_PROMPT = """Você é o Concurso Assistant do Trilha, um assistente especializado em concursos públicos brasileiros.
Use APENAS o contexto fornecido abaixo (trechos de documentos do usuário) para responder.
Se a informação não estiver no contexto, diga "Não encontrei essa informação nos seus documentos."
NÃO invente informações. Seja conciso e direto.

Contexto dos documentos:
{contexto}"""


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


async def chat_stream_response(
    messages: List[Dict[str, str]],
    document_ids: List[str],
    user_id: str,
    session_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    supabase = _get_supabase()

    if not session_id:
        result = (
            supabase.table("chat_sessions")
            .insert({
                "user_id": user_id,
                "document_ids": document_ids,
                "titulo": messages[0]["content"][:80] if messages else "Nova conversa",
            })
            .execute()
        )
        session_id = result.data[0]["id"]
    else:
        result = (
            supabase.table("chat_sessions")
            .select("*")
            .eq("id", session_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise ValueError("Sessão não encontrada")

    user_msg = messages[-1]["content"]

    chunks_raw = await search_similar_chunks(
        query=user_msg,
        document_ids=document_ids,
        user_id=user_id,
        top_k=10,
    )

    chunks_reranked = await rerank_chunks(query=user_msg, chunks=chunks_raw, top_k=5)

    contexto = _build_context(chunks_reranked)
    system_content = RAG_SYSTEM_PROMPT.format(contexto=contexto)

    full_messages = [
        {"role": "system", "content": system_content},
    ] + messages

    supabase.table("chat_messages").insert({
        "session_id": session_id,
        "user_id": user_id,
        "role": "user",
        "content": user_msg,
        "chunks_citados": [c["id"] for c in chunks_reranked],
    }).execute()

    yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"

    full_response = ""
    async with httpx.AsyncClient(timeout=180.0) as client:
        async with client.stream(
            "POST",
            DEEPSEEK_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEFAULT_MODEL,
                "messages": full_messages,
                "max_tokens": 8192,
                "temperature": 0.5,
                "stream": True,
            },
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str == "[DONE]":
                    break
                try:
                    chunk_data = json.loads(data_str)
                    delta = chunk_data.get("choices", [{}])[0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        full_response += content
                        yield f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"
                except json.JSONDecodeError:
                    continue

    supabase.table("chat_messages").insert({
        "session_id": session_id,
        "user_id": user_id,
        "role": "assistant",
        "content": full_response,
        "tokens_used": len(full_response.split()),
        "chunks_citados": [c["id"] for c in chunks_reranked],
    }).execute()

    supabase.table("chat_sessions").update({
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", session_id).execute()

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
