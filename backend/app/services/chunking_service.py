import logging
import re
from typing import List

logger = logging.getLogger(__name__)

CHUNK_SIZE = 512
CHUNK_OVERLAP = 64


class Chunk:
    def __init__(self, index: int, content: str, token_count: int):
        self.index = index
        self.content = content
        self.token_count = token_count


def _estimate_tokens(text: str) -> int:
    return len(text.split())


def _split_paragraphs(text: str) -> List[str]:
    paragrafos = re.split(r"\n\s*\n", text)
    return [p.strip() for p in paragrafos if p.strip()]


def _split_sentences(text: str) -> List[str]:
    sentencas = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentencas if s.strip()]


def chunk_semantico(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[Chunk]:
    paragrafos = _split_paragraphs(text)
    chunks: List[Chunk] = []
    current_chunk: List[str] = []
    current_tokens = 0
    index = 0

    for para in paragrafos:
        sentencas = _split_sentences(para)

        for sent in sentencas:
            sent_tokens = _estimate_tokens(sent)

            if current_tokens + sent_tokens > chunk_size and current_chunk:
                content = " ".join(current_chunk)
                chunks.append(Chunk(index=index, content=content, token_count=_estimate_tokens(content)))
                index += 1

                if overlap > 0 and current_chunk:
                    overlap_sentences = current_chunk[-1:] if len(current_chunk) > 0 else []
                    current_chunk = overlap_sentences if overlap_sentences else []
                    current_tokens = sum(_estimate_tokens(s) for s in current_chunk)

            current_chunk.append(sent)
            current_tokens += sent_tokens

        if current_chunk:
            content = " ".join(current_chunk)
            current_tokens = _estimate_tokens(content)

    if current_chunk:
        content = " ".join(current_chunk)
        chunks.append(Chunk(index=index, content=content, token_count=_estimate_tokens(content)))

    return chunks


def chunk_fixo(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[Chunk]:
    words = text.split()
    chunks: List[Chunk] = []

    if len(words) <= chunk_size:
        content = " ".join(words)
        chunks.append(Chunk(index=0, content=content, token_count=len(words)))
        return chunks

    start = 0
    index = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        content = " ".join(words[start:end])
        chunks.append(Chunk(index=index, content=content, token_count=end - start))
        index += 1
        start += chunk_size - overlap

    return chunks
