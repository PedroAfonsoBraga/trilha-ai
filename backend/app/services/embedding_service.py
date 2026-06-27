import asyncio
import logging
import os
import re
from typing import Dict, List

from dotenv import load_dotenv
import httpx

load_dotenv()

logger = logging.getLogger(__name__)

VOYAGE_API_KEY = os.getenv("VOYAGE_API_KEY", "")
VOYAGE_URL = "https://api.voyageai.com/v1/embeddings"
EMBEDDING_MODEL = "voyage-3"
EMBEDDING_DIM = 1024
MAX_BATCH_SIZE = 128


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
            jitter = delay * 0.1  # noqa: F841
            logger.warning(
                f"Voyage API 429 (attempt {attempt + 1}/{max_retries + 1}), "
                f"retrying in {delay:.1f}s"
            )
            await asyncio.sleep(delay)
    response.raise_for_status()
    return response


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
            response = await _post_with_retry(
                client,
                VOYAGE_URL,
                headers={
                    "Authorization": f"Bearer {VOYAGE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json_data={
                    "model": EMBEDDING_MODEL,
                    "input": batch,
                    "input_type": input_type,
                },
            )
            data = response.json()
            all_embeddings.extend([emb["embedding"] for emb in data["data"]])

    return all_embeddings


async def gerar_embedding(text: str, input_type: str = "query") -> List[float]:
    embeddings = await gerar_embeddings_batch([text], input_type=input_type)
    return embeddings[0]
