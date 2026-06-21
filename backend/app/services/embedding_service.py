import asyncio
import logging
import os
import re
from typing import Dict, List

import httpx

logger = logging.getLogger(__name__)

VOYAGE_API_KEY = os.getenv("VOYAGE_API_KEY", "")
VOYAGE_URL = "https://api.voyageai.com/v1/embeddings"
EMBEDDING_MODEL = "voyage-3-lite"
EMBEDDING_DIM = 1024
MAX_BATCH_SIZE = 128


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def gerar_embeddings_batch(
    texts: List[str],
    input_type: str = "document",
) -> List[List[float]]:
    if not VOYAGE_API_KEY:
        raise RuntimeError("VOYAGE_API_KEY não configurada")

    cleaned = [_clean_text(t) for t in texts]
    batches = [cleaned[i : i + MAX_BATCH_SIZE] for i in range(0, len(cleaned), MAX_BATCH_SIZE)]

    all_embeddings: List[List[float]] = []

    async with httpx.AsyncClient(timeout=120.0) as client:
        for batch in batches:
            response = await client.post(
                VOYAGE_URL,
                headers={
                    "Authorization": f"Bearer {VOYAGE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": EMBEDDING_MODEL,
                    "input": batch,
                    "input_type": input_type,
                },
            )
            response.raise_for_status()
            data = response.json()
            all_embeddings.extend([emb["embedding"] for emb in data["data"]])

    return all_embeddings


async def gerar_embedding(text: str, input_type: str = "query") -> List[float]:
    embeddings = await gerar_embeddings_batch([text], input_type=input_type)
    return embeddings[0]
