import json
import logging
import os
from typing import Dict, Iterable, List, Optional

from dotenv import load_dotenv

from app.services import embedding_service

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


async def search_similar_chunks(
    query: str,
    document_ids: List[str],
    user_id: str,
    top_k: int = 10,
) -> List[Dict]:
    """Busca semântica pura via pgvector (mantida para compatibilidade)."""
    query_model = embedding_service.get_query_model()
    query_embedding = await embedding_service.gerar_embedding(query, input_type="query", model=query_model)

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


async def search_hybrid_chunks(
    query: str,
    document_ids: List[str],
    user_id: str,
    top_k: int = 20,
    keywords: Optional[List[str]] = None,
) -> List[Dict]:
    """Busca híbrida: semantic (pgvector) + lexical (FTS) fundidos por RRF.

    Args:
        query: Pergunta do usuário (pode ser coloquial).
        document_ids: Lista de UUIDs dos documentos a buscar.
        user_id: UUID do usuário (RLS).
        top_k: Número de chunks a retornar.
        keywords: Termos extras para dar boost lexical (ex: ['matemática']).

    Returns:
        Lista de chunks ordenados pelo score RRF decrescente.
    """
    query_model = embedding_service.get_query_model()
    query_embedding = await embedding_service.gerar_embedding(query, input_type="query", model=query_model)

    supabase = _get_supabase()

    result = (
        supabase.rpc(
            "search_chunks_hybrid",
            {
                "query_embedding": query_embedding,
                "p_query": query,
                "p_document_ids": document_ids,
                "p_user_id": user_id,
                "p_keywords": keywords or [],
                "p_top_k": top_k,
            },
        )
        .execute()
    )

    return result.data or []


def merge_rrf_results(
    chunk_lists: Iterable[List[Dict]],
    k: int = 60,
) -> List[Dict]:
    """Fundir múltiplas listas de chunks via Reciprocal Rank Fusion.

    Args:
        chunk_lists: Listas de chunks já ordenadas (cada uma é um ranking).
        k: Constante de suavização do RRF (padrão 60).

    Returns:
        Lista única de chunks ordenada pelo score RRF decrescente,
        sem duplicatas (deduplicação por id).
    """
    scores: Dict[str, float] = {}
    metas: Dict[str, Dict] = {}

    for chunks in chunk_lists:
        for rank, chunk in enumerate(chunks, start=1):
            chunk_id = chunk.get("id")
            if not chunk_id:
                continue
            metas[chunk_id] = chunk
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k + rank)

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    result = []
    for chunk_id, score in ranked:
        chunk = metas[chunk_id].copy()
        chunk["rrf_score"] = score
        result.append(chunk)

    return result


async def rerank_chunks(
    query: str,
    chunks: List[Dict],
    top_k: int = 8,
    user_id: Optional[str] = None,
    min_similarity: float = 0.25,
) -> List[Dict]:
    """Rerank LLM de chunks por relevância para a query.

    Args:
        query: Pergunta do usuário.
        chunks: Chunks candidatos (esperado já ordenado por RRF/hybrid).
        top_k: Quantos chunks manter no final.
        user_id: ID do usuário para tracking de custo.
        min_similarity: Score mínimo de similaridade vetorial para entrar no rerank.

    Returns:
        Chunks reordenados ou, em caso de falha, os chunks originais limitados a top_k.
    """
    if not chunks:
        return []

    # Filtra lixo semântico antes de gastar tokens com rerank
    filtered = [c for c in chunks if c.get("similarity", 0.0) >= min_similarity]
    if not filtered:
        # Se nada passou no threshold, devolve os originais (evita resposta vazia por segurança)
        filtered = chunks

    if len(filtered) <= top_k:
        return filtered

    # Usa o chunk quase completo no prompt (não trunca a 500 chars)
    chunk_texts = "\n\n---\n\n".join(
        [f"[{i}] {c.get('content', '')}" for i, c in enumerate(filtered)]
    )

    system_prompt = (
        "Você é um reranker de relevância. Dada uma query e uma lista de chunks de documentos, "
        "retorne os índices dos chunks mais relevantes ordenados por relevância decrescente. "
        "Responda APENAS com um JSON: {\"ranked_indices\": [3, 0, 7, 1, 5]}"
    )

    from app.services.llm_client import generate_text

    content = await generate_text(
        system_prompt=system_prompt,
        user_text=f"Query: {query}\n\nChunks:\n{chunk_texts}",
        feature="search_rerank",
        max_tokens=256,
        temperature=0,
        user_id=user_id,
    )

    try:
        content = content.strip()
        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()
        ranked = json.loads(content)
        indices = ranked.get("ranked_indices", [])
        result = [filtered[i] for i in indices if isinstance(i, int) and 0 <= i < len(filtered)]
        # Garante que todo chunk válido apareça (fallback posicional)
        seen = {id(c) for c in result}
        for i, chunk in enumerate(filtered):
            if id(chunk) not in seen:
                result.append(chunk)
        return result[:top_k]
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning("Rerank falhou, usando ordem híbrida: %s", e)
        return filtered[:top_k]
