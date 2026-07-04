"""Testes unitários para embedding_service.py"""

import os

from app.services import embedding_service


class TestGetDocModel:
    def test_default_is_voyage3(self):
        """Sem env var, get_doc_model retorna voyage-3."""
        os.environ.pop("EMBEDDING_MODEL_VERSION", None)
        # Recarrega o módulo para pegar o novo valor (efeito colateral)
        import importlib
        importlib.reload(embedding_service)
        assert embedding_service.get_doc_model() == "voyage-3"
        assert embedding_service.get_query_model() == "voyage-3"

    def test_voyage4_returns_correct_models(self):
        """Com EMBEDDING_MODEL_VERSION=voyage-4, retorna os modelos corretos."""
        os.environ["EMBEDDING_MODEL_VERSION"] = "voyage-4"
        import importlib
        importlib.reload(embedding_service)
        assert embedding_service.get_doc_model() == "voyage-4-large"
        assert embedding_service.get_query_model() == "voyage-4-lite"

    def test_voyage3_returns_correct_models(self):
        """Com EMBEDDING_MODEL_VERSION=voyage-3, retorna voyage-3."""
        os.environ["EMBEDDING_MODEL_VERSION"] = "voyage-3"
        import importlib
        importlib.reload(embedding_service)
        assert embedding_service.get_doc_model() == "voyage-3"
        assert embedding_service.get_query_model() == "voyage-3"
