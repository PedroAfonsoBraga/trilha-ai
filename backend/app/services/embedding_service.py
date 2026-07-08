import asyncio
import logging
import os
import random
import re
from typing import Dict, List, Optional

from dotenv import load_dotenv
import httpx

load_dotenv()

logger = logging.getLogger(__name__)

VOYAGE_API_KEY = os.getenv("VOYAGE_API_KEY", "")
VOYAGE_URL = "https://api.voyageai.com/v1/embeddings"
EMBEDDING_DIM = 1024
MAX_BATCH_SIZE = 128

# Feature flag para cutover de modelos Voyage (Sprint 15).
# Valores válidos: 'voyage-3' | 'voyage-4'
# Durante a migração, mantenha 'voyage-3' até que todos os chunks antigos
# tenham sido re-indexados com voyage-4-large (Fase 7).
EMBEDDING_MODEL_VERSION = os.getenv("EMBEDDING_MODEL_VERSION", "voyage-3")

if EMBEDDING_MODEL_VERSION == "voyage-4":
    DEFAULT_DOC_MODEL = "voyage-4-large"
    DEFAULT_QUERY_MODEL = "voyage-4-lite"
else:
    DEFAULT_DOC_MODEL = "voyage-3"
    DEFAULT_QUERY_MODEL = "voyage-3"


def get_doc_model() -> str:
    """Retorna o modelo Voyage usado para indexar documentos."""
    return DEFAULT_DOC_MODEL


def get_query_model() -> str:
    """Retorna o modelo Voyage usado para embeddar queries em tempo real."""
    return DEFAULT_QUERY_MODEL


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def _post_with_retry(
    client: httpx.AsyncClient,
    url: str,
    headers: Dict,
    json_data: Dict,
    max_retries: int = 3,
    base_delay: float = 2.0,
) -> httpx.Response:
    for attempt in range(max_retries + 1):
        response = await client.post(url, headers=headers, json=json_data)
        if response.status_code != 429:
            response.raise_for_status()
            return response
        if attempt < max_retries:
            delay = base_delay * (2 ** attempt)
            jitter = random.uniform(0, delay * 0.1)
            delay_with_jitter = delay + jitter
            logger.warning(
                f"Voyage API 429 (attempt {attempt + 1}/{max_retries + 1}), "
                f"retrying in {delay_with_jitter:.1f}s"
            )
            await asyncio.sleep(delay_with_jitter)
    response.raise_for_status()
    return response


# Cache em memória para preços de embedding
# Chave: model  Valor: (preco_por_token, timestamp_expira)
_PRECO_CACHE: dict[str, tuple[float, float]] = {}
_PRECO_CACHE_DURATION = 300  # 5 minutos


def _estimativa_tokens(texto: str) -> int:
    """Estimativa simples de tokens: palavras * 1.3 (média pt-BR)."""
    if not texto:
        return 0
    return int(len(texto.split()) * 1.3)


def _buscar_preco_embedding(model: str) -> float:
    """Busca preço de input por token em precos_modelo; fallback zero.

    Usa cache em memória _PRECO_CACHE para evitar query ao banco a cada batch.
    """
    import time

    now = time.monotonic()
    entry = _PRECO_CACHE.get(model)
    if entry and now < entry[1]:
        return entry[0]

    try:
        from supabase import create_client
        supabase = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        )
        result = (
            supabase.table("precos_modelo")
            .select("preco_input_por_mi")
            .eq("provider", "voyage")
            .eq("model", model)
            .order("ativo_desde", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            preco = float(result.data[0].get("preco_input_por_mi", 0) or 0) / 1_000_000
            _PRECO_CACHE[model] = (preco, now + _PRECO_CACHE_DURATION)
            return preco
    except Exception as e:
        logger.warning("Falha ao buscar preço de embedding %s: %s", model, e)
    # Fallback: cache com zero para evitar repetir a falha por 5 min
    _PRECO_CACHE[model] = (0.0, now + _PRECO_CACHE_DURATION)
    return 0.0


async def _log_embedding_usage(
    user_id: Optional[str],
    model: str,
    input_type: str,
    texts: List[str],
) -> None:
    """Registra uso de embeddings Voyage em ai_usage_log (fire-and-forget)."""
    if not user_id:
        logger.debug("Skipping embedding ai_usage_log: user_id ausente")
        return

    total_input_tokens = sum(_estimativa_tokens(t) for t in texts)
    preco_por_token = _buscar_preco_embedding(model)
    custo_usd = total_input_tokens * preco_por_token
    feature = "embedding_documento" if input_type == "document" else "embedding_query"

    try:
        from supabase import create_client
        supabase = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        )
        payload = {
            "user_id": user_id,
            "feature": feature,
            "model": model,
            "provider": "voyage",
            "input_tokens": total_input_tokens,
            "output_tokens": 0,
            "reasoning_tokens": 0,
            "cache_hit": False,
            "status": "sucesso",
            "custo_estimado_usd": round(custo_usd, 6),
        }
        supabase.table("ai_usage_log").insert(payload).execute()
    except Exception as e:
        logger.warning("Falha ao registrar embedding em ai_usage_log: %s", e)


async def gerar_embeddings_batch(
    texts: List[str],
    input_type: str = "document",
    model: str = None,
    user_id: Optional[str] = None,
) -> List[List[float]]:
    if not VOYAGE_API_KEY:
        raise RuntimeError("VOYAGE_API_KEY não configurada")

    if model is None:
        model = DEFAULT_DOC_MODEL if input_type == "document" else DEFAULT_QUERY_MODEL

    cleaned = [_clean_text(t) for t in texts]
    batches = [cleaned[i : i + MAX_BATCH_SIZE] for i in range(0, len(cleaned), MAX_BATCH_SIZE)]

    all_embeddings: List[List[float]] = []

    async with httpx.AsyncClient(timeout=120.0) as client:
        for batch in batches:
            response = await _post_with_retry(
                client,
                VOYAGE_URL,
                headers={
                    "Authorization": f"Bearer {VOYAGE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json_data={
                    "model": model,
                    "input": batch,
                    "input_type": input_type,
                },
            )
            data = response.json()
            all_embeddings.extend([emb["embedding"] for emb in data["data"]])

    # Log fire-and-forget (não bloqueia retorno)
    await _log_embedding_usage(user_id=user_id, model=model, input_type=input_type, texts=cleaned)

    return all_embeddings


async def gerar_embedding(
    text: str, input_type: str = "query", model: str = None, user_id: Optional[str] = None
) -> List[float]:
    embeddings = await gerar_embeddings_batch([text], input_type=input_type, model=model, user_id=user_id)
    return embeddings[0]
