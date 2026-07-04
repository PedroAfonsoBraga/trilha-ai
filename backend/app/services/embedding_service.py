import asyncio
import logging
import os
import random
import re
from typing import Dict, List

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


async def gerar_embeddings_batch(
    texts: List[str],
    input_type: str = "document",
    model: str = None,
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

    return all_embeddings


async def gerar_embedding(text: str, input_type: str = "query", model: str = None) -> List[float]:
    embeddings = await gerar_embeddings_batch([text], input_type=input_type, model=model)
    return embeddings[0]
