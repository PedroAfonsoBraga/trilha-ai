import json
import logging
import os
from typing import Dict, List, Optional

import httpx

from app.services.embedding_service import gerar_embedding

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEFAULT_MODEL = "deepseek-v4-flash"


def _get_supabase():
    from supabase import create_client

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


async def search_similar_chunks(
    query: str,
    document_ids: List[str],
    user_id: str,
    top_k: int = 10,
) -> List[Dict]:
    query_embedding = await gerar_embedding(query, input_type="query")

    supabase = _get_supabase()

    result = (
        supabase.rpc(
            "search_chunks",
            {
                "query_embedding": query_embedding,
                "p_document_ids": document_ids,
                "p_user_id": user_id,
                "p_top_k": top_k,
            },
        )
        .execute()
    )

    return result.data or []


async def rerank_chunks(query: str, chunks: List[Dict], top_k: int = 5) -> List[Dict]:
    if not chunks:
        return []

    if len(chunks) <= top_k:
        return chunks

    chunk_texts = "\n\n---\n\n".join(
        [f"[{i}] {c.get('content', '')[:500]}" for i, c in enumerate(chunks)]
    )

    system_prompt = (
        "Você é um reranker de relevância. Dada uma query e uma lista de chunks de documentos, "
        "retorne os índices dos chunks mais relevantes ordenados por relevância decrescente. "
        "Responda APENAS com um JSON: {\"ranked_indices\": [3, 0, 7, 1, 5]}"
    )

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            DEEPSEEK_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEFAULT_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Query: {query}\n\nChunks:\n{chunk_texts}"},
                ],
                "max_tokens": 256,
                "temperature": 0,
            },
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]

    try:
        content = content.strip()
        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()
        ranked = json.loads(content)
        indices = ranked.get("ranked_indices", [])
        result = [chunks[i] for i in indices if i < len(chunks)]
        return result[:top_k]
    except (json.JSONDecodeError, KeyError):
        return chunks[:top_k]
