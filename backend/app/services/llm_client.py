"""
Cliente compartilhado para chamadas à API DeepSeek V4 Flash via OpenRouter.

Usa o SDK OpenAI (AsyncOpenAI) com base_url apontando para o endpoint
OpenAI-compatible do OpenRouter: https://openrouter.ai/api/v1

Responsabilidades:
  - Chamadas non-streaming (generate_text) e streaming (generate_text_stream)
  - Rastreamento de tokens e custo via ai_usage_log
  - Cache de outputs repetidos via cache_service
  - Fallback para estimativa quando metadata de tokens não está disponível
  - Reasoning opcional controlado pela env OPENROUTER_REASONING

Uso:
    from app.services.llm_client import generate_text

    text = await generate_text(
        system_prompt="...",
        user_text="...",
        feature="flashcard",  # obrigatório para tracking
    )
"""

import logging
import os
from typing import AsyncGenerator, Optional

from dotenv import load_dotenv
from openai import AsyncOpenAI

from app.services import cache_service

load_dotenv()

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_REASONING = os.getenv("OPENROUTER_REASONING", "off").lower() == "on"
DEFAULT_MODEL = "deepseek/deepseek-v4-flash"

# Preços DeepSeek V4 Flash (USD por 1M tokens) — OpenRouter
# Fonte: https://openrouter.ai/deepseek/deepseek-v4-flash (Jul 2026)
PRECO_INPUT_USD = 0.09 / 1_000_000
PRECO_OUTPUT_USD = 0.18 / 1_000_000

_client: Optional[AsyncOpenAI] = None
_APP_URL = os.getenv("NEXT_PUBLIC_APP_URL", "")


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY não configurada")
        _client = AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": _APP_URL or "https://trilha.ai",
                "X-Title": "Trilha",
            },
            timeout=60.0,
        )
    return _client


def _estimativa_tokens(texto: str | None) -> int:
    """Estimativa simples de tokens: palavras * 1.3 (média pt-BR)."""
    if not texto:
        return 0
    return int(len(texto.split()) * 1.3)


def _extrair_usage(response) -> dict:
    """Extrai contagem de tokens da resposta do Chat Completions (OpenAI format).

    O campo `usage` está sempre presente em respostas non-streaming.
    Para streaming, o usage vem no chunk final quando
    `stream_options={"include_usage": True}` está ativo.
    """
    usage = {
        "input_tokens": 0,
        "output_tokens": 0,
        "reasoning_tokens": 0,
    }

    try:
        usage_data = getattr(response, "usage", None)
        if usage_data:
            usage["input_tokens"] = getattr(usage_data, "prompt_tokens", 0) or 0
            usage["output_tokens"] = getattr(usage_data, "completion_tokens", 0) or 0
            usage["reasoning_tokens"] = getattr(usage_data, "reasoning_tokens", 0) or 0
    except Exception:
        pass

    return usage


async def _log_ai_usage(
    user_id: str,
    feature: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    reasoning_tokens: int = 0,
) -> None:
    """Registra uso de IA na tabela ai_usage_log (fire-and-forget).

    Assíncrono mas não bloqueia — roda em background.
    Se falhar, apenas loga warning (não quebra a resposta).
    """
    custo_usd = (input_tokens * PRECO_INPUT_USD) + (output_tokens * PRECO_OUTPUT_USD)

    try:
        from supabase import create_client
        supabase = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        )

        supabase.table("ai_usage_log").insert({
            "user_id": user_id,
            "feature": feature,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "custo_estimado_usd": round(custo_usd, 6),
        }).execute()
    except Exception as e:
        logger.warning("Falha ao registrar ai_usage_log: %s", e)


def _build_reasoning_kwargs() -> dict:
    """Retorna kwargs extras para ativar reasoning no DeepSeek, se configurado.

    OpenRouter aceita o campo `reasoning` no corpo da requisição.
    Como o SDK OpenAI não expõe isso nativamente, usamos `extra_body`.
    """
    if not OPENROUTER_REASONING:
        return {}
    return {
        "extra_body": {
            "reasoning": {
                "enabled": True,
                "max_tokens": 1024,
            }
        }
    }


# ──────────────────────────────────────────────
#  Non-streaming
# ──────────────────────────────────────────────


async def generate_text(
    system_prompt: str,
    user_text: str,
    feature: str = "unknown",
    model: str = DEFAULT_MODEL,
    max_tokens: int = 16384,
    temperature: float = 0.3,
    user_id: Optional[str] = None,
    skip_cache: bool = False,
) -> str:
    """Chama DeepSeek V4 Flash via OpenRouter e retorna o texto gerado.

    Args:
        system_prompt: Instruções de sistema para o modelo.
        user_text: Texto/prompt do usuário.
        feature: Nome da feature (flashcard, edital_parser, search_rerank).
        model: Modelo a usar (default: deepseek/deepseek-v4-flash).
        max_tokens: Máximo de tokens na resposta.
        temperature: Temperatura para geração (0.0-1.0).
        user_id: ID do usuário (obrigatório para tracking de custo).
        skip_cache: Se True, ignora o cache e força chamada à API.

    Returns:
        Texto gerado pelo modelo.
    """
    # 1. Verifica cache (se não for skipado)
    if not skip_cache:
        cached = cache_service.get_cached(model, system_prompt, user_text, feature)
        if cached is not None:
            return cached

    # 2. Monta mensagens no formato Chat Completions
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_text},
    ]

    # 3. Chama OpenRouter (OpenAI-compatible)
    client = _get_client()
    kwargs = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    kwargs.update(_build_reasoning_kwargs())

    response = await client.chat.completions.create(**kwargs)

    # 4. Extrai texto da resposta
    if not response.choices:
        logger.error(
            "Resposta da IA veio sem choices para feature=%s model=%s. response=%s",
            feature, model, response,
        )
        raise RuntimeError(
            f"Modelo {model} retornou resposta vazia (sem choices) para feature={feature}. "
            "Verifique API key ou disponibilidade do modelo."
        )

    choice = response.choices[0]
    output_text = getattr(choice.message, "content", None)
    if output_text is None:
        finish_reason = getattr(choice, "finish_reason", "unknown")
        logger.error(
            "Resposta da IA veio com content=None para feature=%s model=%s. "
            "finish_reason=%s response=%s",
            feature, model, finish_reason, response,
        )
        raise RuntimeError(
            f"Modelo {model} retornou resposta vazia (content=None) para feature={feature}. "
            "Verifique API key, disponibilidade do modelo ou bloqueios de segurança."
        )

    # 5. Extrai metadados de tokens
    usage = _extrair_usage(response)
    if usage["input_tokens"] == 0:
        usage["input_tokens"] = _estimativa_tokens(system_prompt + user_text)
    if usage["output_tokens"] == 0:
        usage["output_tokens"] = _estimativa_tokens(output_text)

    # 6. Registra uso (fire-and-forget)
    if user_id:
        await _log_ai_usage(
            user_id=user_id,
            feature=feature,
            model=model,
            input_tokens=usage["input_tokens"],
            output_tokens=usage["output_tokens"],
            reasoning_tokens=usage.get("reasoning_tokens", 0),
        )

    # 7. Armazena no cache
    if not skip_cache:
        cache_service.set_cached(
            model=model,
            system_prompt=system_prompt,
            user_text=user_text,
            feature=feature,
            output=output_text,
            input_tokens=usage["input_tokens"],
            output_tokens=usage["output_tokens"],
        )

    return output_text


# ──────────────────────────────────────────────
#  Streaming
# ──────────────────────────────────────────────


async def generate_text_stream(
    system_prompt: str,
    user_text: str,
    feature: str = "chat",
    model: str = DEFAULT_MODEL,
    temperature: float = 0.5,
    user_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Chama DeepSeek V4 Flash com streaming via OpenRouter.

    Args:
        system_prompt: Instruções de sistema.
        user_text: Texto/prompt do usuário.
        feature: Nome da feature (default: chat).
        model: Modelo a usar.
        temperature: Temperatura para geração.
        user_id: ID do usuário para tracking.

    Yields:
        Chunks de texto conforme gerados pelo modelo.
    """
    # Monta mensagens no formato Chat Completions
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_text},
    ]

    client = _get_client()
    kwargs = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": True,
        "stream_options": {"include_usage": True},
    }
    kwargs.update(_build_reasoning_kwargs())

    stream = await client.chat.completions.create(**kwargs)

    full_response = ""
    final_usage = None

    async for chunk in stream:
        # O chunk final com usage tem choices vazio
        if not chunk.choices and chunk.usage:
            final_usage = chunk.usage
            continue

        delta = chunk.choices[0].delta if chunk.choices else None
        content = getattr(delta, "content", None) if delta else None
        if content:
            full_response += content
            yield content

    # No final do stream, registra uso
    usage = _extrair_usage(final_usage) if final_usage else {
        "input_tokens": 0, "output_tokens": 0, "reasoning_tokens": 0,
    }
    if usage["input_tokens"] == 0:
        usage["input_tokens"] = _estimativa_tokens(system_prompt + user_text)
    if usage["output_tokens"] == 0:
        usage["output_tokens"] = _estimativa_tokens(full_response)

    if user_id:
        await _log_ai_usage(
            user_id=user_id,
            feature=feature,
            model=model,
            input_tokens=usage["input_tokens"],
            output_tokens=usage["output_tokens"],
            reasoning_tokens=usage.get("reasoning_tokens", 0),
        )
