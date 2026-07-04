"""Testes unitários para pdf_cache_service.py"""

import hashlib
from unittest.mock import MagicMock, patch

import pytest

from app.services import pdf_cache_service
from app.services.chunking_service import Chunk


class TestMakeFileHash:
    def test_sha256_consistency(self):
        """Mesmo conteúdo produz o mesmo hash."""
        h1 = pdf_cache_service.make_file_hash(b"conteudo do pdf")
        h2 = pdf_cache_service.make_file_hash(b"conteudo do pdf")
        assert h1 == h2

    def test_different_content_different_hash(self):
        """Conteúdos diferentes produzem hashes diferentes."""
        h1 = pdf_cache_service.make_file_hash(b"pdf a")
        h2 = pdf_cache_service.make_file_hash(b"pdf b")
        assert h1 != h2

    def test_output_format(self):
        """Hash é uma string hexadecimal de 64 caracteres (SHA-256)."""
        h = pdf_cache_service.make_file_hash(b"qualquer coisa")
        assert len(h) == 64
        assert h == hashlib.sha256(b"qualquer coisa").hexdigest()


class TestChunksToJsonb:
    def test_with_embeddings(self):
        """Converte objetos Chunk + embeddings para JSONB."""
        chunks = [
            Chunk(index=0, content="Chunk A", token_count=10, section="Seção 1"),
            Chunk(index=1, content="Chunk B", token_count=5),
        ]
        embeddings = [[0.1, 0.2], [0.3, 0.4]]
        result = pdf_cache_service._chunks_to_jsonb(chunks, embeddings)

        assert len(result) == 2
        assert result[0]["chunk_index"] == 0
        assert result[0]["content"] == "Chunk A"
        assert result[0]["token_count"] == 10
        assert result[0]["section"] == "Seção 1"
        assert result[0]["embedding"] == [0.1, 0.2]
        assert result[1]["embedding"] == [0.3, 0.4]

    def test_without_embeddings(self):
        """Converte chunks sem embeddings."""
        chunks = [Chunk(index=0, content="Conteúdo", token_count=3)]
        result = pdf_cache_service._chunks_to_jsonb(chunks)
        assert len(result) == 1
        assert "embedding" not in result[0]

    def test_with_dict_input(self):
        """Aceita dicionários como chunks."""
        chunks = [{"chunk_index": 0, "content": "Dict chunk", "token_count": 2}]
        result = pdf_cache_service._chunks_to_jsonb(chunks)
        assert result[0]["content"] == "Dict chunk"

    def test_empty_input(self):
        """Lista vazia retorna lista vazia."""
        assert pdf_cache_service._chunks_to_jsonb([], []) == []


@patch("app.services.pdf_cache_service._get_supabase")
class TestGetCachedDocument:
    def test_returns_none_when_no_cache(self, mock_get_supabase):
        """Retorna None quando não há cache."""
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = []
        mock_get_supabase.return_value = mock_supabase

        result = pdf_cache_service.get_cached_document("hash123", "voyage-3")
        assert result is None

    def test_returns_data_when_cache_exists(self, mock_get_supabase):
        """Retorna dados do cache quando encontrado."""
        cached_data = {
            "texto_extraido": "texto",
            "markdown_text": "markdown",
            "chunks_jsonb": [],
            "page_count": 10,
        }
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [cached_data]
        mock_get_supabase.return_value = mock_supabase

        result = pdf_cache_service.get_cached_document("hash123", "voyage-3")
        assert result == cached_data


@patch("app.services.pdf_cache_service._get_supabase")
class TestSetCachedDocument:
    def test_preserves_complete_cache_on_partial_write(self, mock_get_supabase):
        """Não sobrescreve cache completo com dados parciais (sem chunks)."""
        # Simula cache existente com chunks completos
        existing_data = {
            "texto_extraido": "texto existente",
            "chunks_jsonb": [{"content": "chunk", "embedding": [0.1]}],
        }
        mock_supabase = MagicMock()
        # Primeira chamada (get_cached_document) retorna cache completo
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [existing_data]
        mock_get_supabase.return_value = mock_supabase

        # Tenta salvar sem chunks
        pdf_cache_service.set_cached_document(
            file_hash="hash123",
            embedding_model="voyage-3",
            texto_extraido="texto parcial",
        )

        # upsert NÃO deve ser chamado (cache completo preservado)
        mock_supabase.table.return_value.upsert.assert_not_called()

    def test_writes_complete_cache(self, mock_get_supabase):
        """Escreve cache quando não há entrada existente."""
        mock_supabase = MagicMock()
        # Primeira chamada (get_cached_document) retorna None
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = []
        mock_get_supabase.return_value = mock_supabase

        chunks = [Chunk(index=0, content="Chunk", token_count=2)]
        embeddings = [[0.1]]

        pdf_cache_service.set_cached_document(
            file_hash="hash456",
            embedding_model="voyage-3",
            texto_extraido="texto",
            chunks=chunks,
            embeddings=embeddings,
            page_count=5,
        )

        # upsert deve ser chamado
        mock_supabase.table.return_value.upsert.assert_called_once()
