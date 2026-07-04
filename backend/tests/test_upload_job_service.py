"""Testes unitários para upload_job_service.py"""

from unittest.mock import MagicMock, patch

from app.services import upload_job_service


class TestStageProgress:
    def test_stage_progress_values(self):
        """STAGE_PROGRESS tem valores esperados para cada estágio."""
        assert upload_job_service.STAGE_PROGRESS["queued"] == 0
        assert upload_job_service.STAGE_PROGRESS["parsing"] == 15
        assert upload_job_service.STAGE_PROGRESS["chunking"] == 40
        assert upload_job_service.STAGE_PROGRESS["embedding"] == 65
        assert upload_job_service.STAGE_PROGRESS["upsert"] == 85
        assert upload_job_service.STAGE_PROGRESS["done"] == 100


@patch("app.services.upload_job_service._get_supabase")
def test_update_job(mock_get_supabase):
    """_update_job atualiza campos corretamente."""
    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase

    upload_job_service._update_job(
        mock_supabase,
        job_id="job-123",
        status="processing",
        stage="parsing",
        progress=50,
        error_msg=None,
    )

    # Verifica que update foi chamado com os parâmetros corretos
    updates = mock_supabase.table.return_value.update.call_args[0][0]
    assert updates["status"] == "processing"
    assert updates["stage"] == "parsing"
    assert updates["progress"] == 50
    assert "updated_at" in updates


@patch("app.services.upload_job_service._get_supabase")
def test_fail_job(mock_get_supabase):
    """_fail_job marca job como failed."""
    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase

    upload_job_service._fail_job(mock_supabase, "job-456", "Erro de teste")

    updates = mock_supabase.table.return_value.update.call_args[0][0]
    assert updates["status"] == "failed"
    assert updates["error_msg"] == "Erro de teste"
    assert "updated_at" in updates


@patch("app.services.upload_job_service._get_supabase")
def test_insert_chunks_batch(mock_get_supabase):
    """_insert_chunks usa batch insert."""
    from app.services.chunking_service import Chunk

    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase

    chunks = [
        Chunk(index=0, content="A", token_count=1),
        Chunk(index=1, content="B", token_count=1),
    ]
    embeddings = [[0.1], [0.2]]

    result = upload_job_service._insert_chunks(
        mock_supabase,
        doc_id="doc-1",
        user_id="user-1",
        chunks=chunks,
        embeddings=embeddings,
        embedding_model="voyage-3",
    )

    assert result == 2

    # Verifica que o delete foi chamado
    mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.assert_called_once()

    # Verifica que insert foi chamado com batch (uma chamada com lista)
    insert_call = mock_supabase.table.return_value.insert.call_args[0][0]
    assert len(insert_call) == 2
    assert insert_call[0]["chunk_index"] == 0
    assert insert_call[0]["embedding"] == [0.1]
    assert insert_call[0]["embedding_model"] == "voyage-3"
