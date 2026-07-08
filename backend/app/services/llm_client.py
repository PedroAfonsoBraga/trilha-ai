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
import time
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

# Cache em memória para preços (evita query ao banco em cada chamada de IA)
# Chave: (provider, model)  Valor: (preco_in_por_tok, preco_out_por_tok, timestamp_expira)
_PRECO_CACHE: dict[tuple[str, str], tuple[float, float, float]] = {}
_PRECO_CACHE_DURATION = 300  # 5 minutos


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


def _buscar_preco_modelo(provider: str, model: str) -> tuple[float, float]:
    """Busca preço vigente em precos_modelo; fallback para hardcoded.

    Usa cache em memória _PRECO_CACHE para evitar query ao banco a cada chamada.
    Cache expira a cada 5 minutos.
    """
    import time

    key = (provider, model)
    now = time.monotonic()

    entry = _PRECO_CACHE.get(key)
    if entry and now < entry[2]:
        return entry[0], entry[1]

    try:
        from supabase import create_client
        supabase = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        )
        result = (
            supabase.table("precos_modelo")
            .select("preco_input_por_mi, preco_output_por_mi")
            .eq("provider", provider)
            .eq("model", model)
            .order("ativo_desde", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            row = result.data[0]
            preco_in = float(row.get("preco_input_por_mi", 0) or 0) / 1_000_000
            preco_out = float(row.get("preco_output_por_mi", 0) or 0) / 1_000_000
            _PRECO_CACHE[key] = (preco_in, preco_out, now + _PRECO_CACHE_DURATION)
            return preco_in, preco_out
    except Exception as e:
        logger.warning("Falha ao buscar precos_modelo (%s/%s): %s", provider, model, e)

    # Fallback hardcoded — também entra no cache
    if provider == "openrouter" and model == DEFAULT_MODEL:
        _PRECO_CACHE[key] = (PRECO_INPUT_USD, PRECO_OUTPUT_USD, now + _PRECO_CACHE_DURATION)
        return PRECO_INPUT_USD, PRECO_OUTPUT_USD

    # Fallback genérico: sem preço conhecido = custo zero (não estimar errado)
    return 0.0, 0.0


async def _log_ai_usage(
    user_id: Optional[str],
    feature: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    reasoning_tokens: int = 0,
    provider: str = "openrouter",
    cache_hit: bool = False,
    duracao_ms: Optional[int] = None,
    status: str = "sucesso",
    erro_detalhe: Optional[str] = None,
    edital_id: Optional[str] = None,
) -> None:
    """Registra uso de IA na tabela ai_usage_log (fire-and-forget).

    Assíncrono mas não bloqueia — roda em background.
    Se falhar, apenas loga warning (não quebra a resposta).

    Args:
        user_id: ID do usuário (pode ser None para chamadas sem contexto de usuário,
            ex: alguns embeddings de query).
        feature: Nome da feature (chat, flashcard, edital_parser, etc).
        model: Nome do modelo.
        input_tokens: Tokens de entrada.
        output_tokens: Tokens de saída.
        reasoning_tokens: Tokens de reasoning (DeepSeek).
        provider: Provider da chamada (openrouter, voyage, etc).
        cache_hit: Se True, o custo real é zero (resultado veio do cache).
        duracao_ms: Latência da chamada em ms.
        status: 'sucesso', 'erro' ou 'timeout'.
        erro_detalhe: Detalhe do erro quando status != 'sucesso'.
        edital_id: ID do edital relacionado (quando aplicável).
    """
    if not user_id:
        # ai_usage_log.user_id é NOT NULL; sem usuário não há como atribuir custo.
        logger.debug("Skipping ai_usage_log: user_id ausente (feature=%s)", feature)
        return

    if cache_hit or status != "sucesso":
        custo_usd = 0.0
    else:
        preco_in, preco_out = _buscar_preco_modelo(provider, model)
        custo_usd = (input_tokens * preco_in) + (output_tokens * preco_out)

    try:
        from supabase import create_client
        supabase = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        )

        payload = {
            "user_id": user_id,
            "feature": feature,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "reasoning_tokens": reasoning_tokens,
            "provider": provider,
            "cache_hit": cache_hit,
            "duracao_ms": duracao_ms,
            "status": status,
            "erro_detalhe": erro_detalhe,
            "custo_estimado_usd": round(custo_usd, 6),
        }
        if edital_id:
            payload["edital_id"] = edital_id

        supabase.table("ai_usage_log").insert(payload).execute()
    except Exception as e:
        logger.warning("Falha ao registrar ai_usage_log: %s", e)


def _build_reasoning_kwargs(disable: bool = False) -> dict:
    """Retorna kwargs extras para ativar/desativar reasoning no DeepSeek.

    OpenRouter aceita o campo `reasoning` no corpo da requisição.
    Como o SDK OpenAI não expõe isso nativamente, usamos `extra_body`.

    Args:
        disable: Se True, desativa reasoning explicitamente (útil para
            tarefas simples como rerank e query rewrite onde o modelo
            não precisa "pensar" e só consumiria tokens sem produzir
            conteúdo).
    """
    if disable:
        return {"extra_body": {"reasoning": {"enabled": False}}}
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
    disable_reasoning: bool = False,
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
        disable_reasoning: Se True, desativa reasoning do modelo (útil para
            tarefas simples como rerank e query rewrite).

    Returns:
        Texto gerado pelo modelo.
    """
    start_ms = int(time.perf_counter() * 1000)

    # 1. Verifica cache (se não for skipado)
    if not skip_cache:
        cached = cache_service.get_cached(model, system_prompt, user_text, feature)
        if cached is not None:
            duracao_ms = int(time.perf_counter() * 1000) - start_ms
            # Estimativa de tokens para medir economia gerada pelo cache
            input_tokens = _estimativa_tokens(system_prompt + user_text)
            output_tokens = _estimativa_tokens(cached)
            await _log_ai_usage(
                user_id=user_id,
                feature=feature,
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                provider="openrouter",
                cache_hit=True,
                duracao_ms=duracao_ms,
                edital_id=None,
            )
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
    kwargs.update(_build_reasoning_kwargs(disable=disable_reasoning))

    try:
        response = await client.chat.completions.create(**kwargs)
    except Exception as e:
        duracao_ms = int(time.perf_counter() * 1000) - start_ms
        await _log_ai_usage(
            user_id=user_id,
            feature=feature,
            model=model,
            input_tokens=_estimativa_tokens(system_prompt + user_text),
            output_tokens=0,
            provider="openrouter",
            duracao_ms=duracao_ms,
            status="erro",
            erro_detalhe=str(e)[:500],
        )
        raise

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
    duracao_ms = int(time.perf_counter() * 1000) - start_ms
    await _log_ai_usage(
        user_id=user_id,
        feature=feature,
        model=model,
        input_tokens=usage["input_tokens"],
        output_tokens=usage["output_tokens"],
        reasoning_tokens=usage.get("reasoning_tokens", 0),
        provider="openrouter",
        cache_hit=False,
        duracao_ms=duracao_ms,
        status="sucesso",
        edital_id=None,
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
    start_ms = int(time.perf_counter() * 1000)

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

    try:
        stream = await client.chat.completions.create(**kwargs)
    except Exception as e:
        duracao_ms = int(time.perf_counter() * 1000) - start_ms
        await _log_ai_usage(
            user_id=user_id,
            feature=feature,
            model=model,
            input_tokens=_estimativa_tokens(system_prompt + user_text),
            output_tokens=0,
            provider="openrouter",
            duracao_ms=duracao_ms,
            status="erro",
            erro_detalhe=str(e)[:500],
        )
        raise

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

    duracao_ms = int(time.perf_counter() * 1000) - start_ms
    await _log_ai_usage(
        user_id=user_id,
        feature=feature,
        model=model,
        input_tokens=usage["input_tokens"],
        output_tokens=usage["output_tokens"],
        reasoning_tokens=usage.get("reasoning_tokens", 0),
        provider="openrouter",
        cache_hit=False,
        duracao_ms=duracao_ms,
        status="sucesso",
    )
