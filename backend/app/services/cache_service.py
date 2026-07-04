"""
Cache de outputs de LLM — evita chamadas repetidas à API DeepSeek V4 Flash (via OpenRouter)

Usa a tabela Supabase `ai_cache` como armazenamento.
O cache é chaveado por SHA-256 do modelo + system_prompt + user_text truncado.

TTLs por feature:
  - flashcard: 24h (mesmo documento = mesmos flashcards)
  - edital_parser: 24h (edital não muda)
  - chat: sem cache (conversas são únicas)
  - search_rerank: 1h (embeddings estáveis)
"""

import hashlib
import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

DEFAULT_TTL_HOURS: dict[str, int] = {
    "flashcard": 24,
    "edital_parser": 24,
    "search_rerank": 1,
}


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _make_hash(model: str, system_prompt: str, user_text: str) -> str:
    """Gera hash determinístico para o cache key.

    Usa os primeiros 200 chars do system_prompt e 500 chars do user_text
    para evitar hash de inputs gigantes (o que seria contraproducente para cache).
    """
    safe_system = system_prompt or ""
    safe_user = user_text or ""
    key = f"{model}|{safe_system[:200]}|{safe_user[:500]}"
    return hashlib.sha256(key.encode()).hexdigest()


def get_cached(
    model: str,
    system_prompt: str,
    user_text: str,
    feature: str,
) -> Optional[str]:
    """Retorna output cacheado ou None se não houver cache válido."""
    if feature == "chat":
        return None  # Chat nunca usa cache

    input_hash = _make_hash(model, system_prompt, user_text)
    supabase = _get_supabase()

    try:
        result = (
            supabase.table("ai_cache")
            .select("output")
            .eq("input_hash", input_hash)
            .gt("expires_at", datetime.utcnow().isoformat())
            .limit(1)
            .execute()
        )
        if result.data:
            logger.info("Cache hit para feature=%s hash=%s...", feature, input_hash[:12])
            return result.data[0]["output"]
    except Exception as e:
        logger.warning("Erro ao consultar cache: %s", e)

    return None


def set_cached(
    model: str,
    system_prompt: str,
    user_text: str,
    feature: str,
    output: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    ttl_hours: Optional[int] = None,
) -> None:
    """Armazena output no cache.

    Args:
        model: Nome do modelo (ex: deepseek/deepseek-v4-flash)
        system_prompt: Prompt de sistema usado
        user_text: Texto do usuário
        feature: Feature que gerou o output (flashcard, fichamento, etc.)
        output: Texto do output para cachear
        input_tokens: Tokens de entrada (para métricas)
        output_tokens: Tokens de saída (para métricas)
        ttl_hours: Horas até expirar (default do feature se não informado)
    """
    if feature == "chat":
        return  # Chat nunca armazena cache

    if ttl_hours is None:
        ttl_hours = DEFAULT_TTL_HOURS.get(feature, 24)

    input_hash = _make_hash(model, system_prompt, user_text)
    expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)
    supabase = _get_supabase()

    try:
        supabase.table("ai_cache").insert({
            "input_hash": input_hash,
            "model": model,
            "feature": feature,
            "output": output,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "expires_at": expires_at.isoformat(),
        }).execute()
        logger.info(
            "Cache armazenado para feature=%s hash=%s... (TTL=%dh)",
            feature, input_hash[:12], ttl_hours,
        )
    except Exception as e:
        logger.warning("Erro ao armazenar cache: %s", e)


def limpar_cache_expirado() -> int:
    """Remove entradas expiradas do cache. Útil para job noturno.

    Returns:
        Número de entradas removidas.
    """
    supabase = _get_supabase()
    try:
        result = (
            supabase.table("ai_cache")
            .delete()
            .lt("expires_at", datetime.utcnow().isoformat())
            .execute()
        )
        # O count pode não vir em todas as versões do supabase-py
        removidos = len(result.data or [])
        if removidos > 0:
            logger.info("Cache expirado limpo: %d entradas removidas", removidos)
        return removidos
    except Exception as e:
        logger.warning("Erro ao limpar cache expirado: %s", e)
        return 0
