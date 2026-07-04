"""
Servico de chunking — divide textos em chunks para insercao em vector store

Suporta duas estrategias:
  - chunk_semantico(): chunking generico por paragrafo/sentenca (ORIGINAL)
  - chunk_fixo(): chunking por janela deslizante (ORIGINAL)
  - chunk_by_type(): chunking diferenciado por tipo de documento (NOVO)

Estrategias por tipo (chunk_by_type):
  edital:         512 tokens, overlap 50, quebra em secoes (##, ###)
  pdf_generico:   1024 tokens, overlap 100, quebra por questao
"""

import logging
import re
from typing import List, Optional

logger = logging.getLogger(__name__)

CHUNK_SIZE = 512
CHUNK_OVERLAP = 64

# Configuracoes de chunking por tipo de documento
CHUNK_CONFIG: dict = {
    "edital": {
        "chunk_size": 512,
        "overlap": 50,
        "separators": ["\n## ", "\n### ", "\n\n", "\n"],
    },
    "pdf_generico": {
        "chunk_size": 1024,
        "overlap": 100,
        "separators": ["\nQuestão", "\nQuestao", "\n\n", "\n"],
    },
}


class Chunk:
    """Representa um unico chunk de texto com metadados."""

    def __init__(
        self,
        index: int,
        content: str,
        token_count: int,
        section: Optional[str] = None,
    ):
        self.index = index
        self.content = content
        self.token_count = token_count
        self.section = section


def _estimate_tokens(text: str) -> int:
    """Estimativa simples de tokens: contagem de palavras."""
    return len(text.split())


def _split_paragraphs(text: str) -> List[str]:
    """Divide texto em paragrafos por linhas em branco."""
    paragrafos = re.split(r"\n\s*\n", text)
    return [p.strip() for p in paragrafos if p.strip()]


def _split_sentences(text: str) -> List[str]:
    """Divide texto em sentencas por pontuacao final."""
    sentencas = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentencas if s.strip()]


def _extract_section_heading(text: str) -> Optional[str]:
    """Tenta extrair o primeiro heading Markdown (##, ###, ####) no texto.

    Usa search em vez de match para capturar headings que nao estao
    exatamente na posicao 0 apos o strip (ex: texto com prefixo antes
    do heading na mesma linha).
    """
    match = re.search(r"^#{1,4}\s+(.+)$", text.strip(), re.MULTILINE)
    if match:
        return match.group(1).strip()
    return None


def chunk_semantico(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> List[Chunk]:
    """Chunking semantico: divide por paragrafos, depois sentencas.

    Args:
        text: Texto a ser chunkado.
        chunk_size: Tamanho maximo em tokens (palavras).
        overlap: Sobreposicao entre chunks em tokens.

    Returns:
        Lista de objetos Chunk.
    """
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
                chunks.append(
                    Chunk(
                        index=index,
                        content=content,
                        token_count=_estimate_tokens(content),
                        section=_extract_section_heading(content),
                    )
                )
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
        chunks.append(
            Chunk(
                index=index,
                content=content,
                token_count=_estimate_tokens(content),
                section=_extract_section_heading(content),
            )
        )

    return chunks


def chunk_fixo(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> List[Chunk]:
    """Chunking por janela deslizante de tamanho fixo.

    Args:
        text: Texto a ser chunkado.
        chunk_size: Tamanho maximo em palavras.
        overlap: Sobreposicao entre chunks em palavras.

    Returns:
        Lista de objetos Chunk.
    """
    words = text.split()
    chunks: List[Chunk] = []

    if len(words) <= chunk_size:
        content = " ".join(words)
        chunks.append(
            Chunk(index=0, content=content, token_count=len(words))
        )
        return chunks

    start = 0
    index = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        content = " ".join(words[start:end])
        chunks.append(
            Chunk(index=index, content=content, token_count=end - start)
        )
        index += 1
        start += chunk_size - overlap

    return chunks


def chunk_by_type(
    text: str,
    doc_type: str,
) -> List[Chunk]:
    """Chunking diferenciado por tipo de documento.

    Usa configuracao especifica por tipo (edital, pdf_generico)
    para definir tamanho de chunk, overlap e separadores.

    Args:
        text: Texto a ser chunkado (de preferencia Markdown estruturado).
        doc_type: Tipo do documento ('edital', 'pdf_generico').

    Returns:
        Lista de objetos Chunk com metadados (section, etc.).
    """
    config = CHUNK_CONFIG.get(doc_type, CHUNK_CONFIG["pdf_generico"])
    chunk_size = config["chunk_size"]
    overlap = config["overlap"]
    separators = config["separators"]

    # Se o texto nao tiver estrutura Markdown, usa chunk_semantico como fallback
    # (textos sem ## provavelmente vieram do PyMuPDF, nao do LlamaParse)
    has_headings = bool(re.search(r"^#{1,4}\s", text, re.MULTILINE))
    if not has_headings:
        logger.debug(
            "Texto sem headings Markdown para tipo=%s — usando chunk_semantico",
            doc_type,
        )
        return chunk_semantico(text, chunk_size=chunk_size, overlap=overlap)

    chunks: List[Chunk] = []
    segments = _split_by_separators(text, separators)
    current_chunk: List[str] = []
    current_tokens = 0
    index = 0

    for segment in segments:
        if not segment.strip():
            continue

        seg_tokens = _estimate_tokens(segment)

        if current_tokens + seg_tokens > chunk_size and current_chunk:
            content = "\n\n".join(current_chunk)
            section = _extract_section_heading(content)
            chunks.append(
                Chunk(
                    index=index,
                    content=content,
                    token_count=_estimate_tokens(content),
                    section=section,
                )
            )
            index += 1

            # Overlap: mantem o ultimo segmento
            if overlap > 0 and current_chunk:
                overlap_text = current_chunk[-1]
                overlap_tokens = _estimate_tokens(overlap_text)
                current_chunk = [overlap_text] if overlap_tokens <= overlap else []
                current_tokens = sum(_estimate_tokens(s) for s in current_chunk)

        current_chunk.append(segment)
        current_tokens += seg_tokens

    if current_chunk:
        content = "\n\n".join(current_chunk)
        section = _extract_section_heading(content)
        chunks.append(
            Chunk(
                index=index,
                content=content,
                token_count=_estimate_tokens(content),
                section=section,
            )
        )

    return chunks


def _split_by_separators(text: str, separators: List[str]) -> List[str]:
    """Divide texto usando uma lista ordenada de separadores.

    Tenta cada separador em ordem; usa o primeiro que encontrar.
    Se nenhum separador for encontrado, retorna o texto inteiro.
    """
    for sep in separators:
        if sep in text:
            parts = text.split(sep)
            # Reinsere o separador no inicio de cada parte (exceto a primeira)
            result = [parts[0]]
            for p in parts[1:]:
                marker = sep.strip()
                result.append(f"{marker} {p.strip()}" if marker else p.strip())
            return [r.strip() for r in result if r.strip()]
    return [text.strip()]
