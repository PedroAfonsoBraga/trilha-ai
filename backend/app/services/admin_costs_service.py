"""
Admin Costs Service — Agregações de custo e uso de IA para o painel administrativo.

Responsabilidades:
- Resumo de custos por período (série temporal, comparação com período anterior)
- Breakdown por feature, provider/modelo e usuário
- Detecção de outliers de custo
- Estimativa de economia gerada pelo cache
- Detalhe linha a linha de uso por usuário

TODAS as queries usam SUPABASE_SERVICE_ROLE_KEY (bypassa RLS) porque admins
precisam ver dados de todos os usuários.

NUNCA usar .single() — usar .limit(1).execute() + check manual.
"""

import logging
import os
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv

from app.services.llm_client import DEFAULT_MODEL

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Cache em memória para preços (evita N queries ao banco)
# Chave: (provider, model)  Valor: (preco_in_por_tok, preco_out_por_tok, timestamp_expira)
_PRECO_CACHE: dict[tuple[str, str], tuple[float, float, float]] = {}
_PRECO_CACHE_DURATION = 300  # 5 minutos


def _buscar_preco_com_cache(provider: str, model: str) -> tuple[float, float]:
    """Busca preço em _PRECO_CACHE ou consulta o banco; cache por 5 min por entrada."""
    import time

    key = (provider, model)
    now = time.monotonic()

    entry = _PRECO_CACHE.get(key)
    if entry and now < entry[2]:
        return entry[0], entry[1]

    # Busca no banco
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

    # Fallback hardcoded — evita chamada extra ao banco se fallback também for usado
    if provider == "openrouter" and model == DEFAULT_MODEL:
        from app.services.llm_client import PRECO_INPUT_USD, PRECO_OUTPUT_USD
        resultado = (PRECO_INPUT_USD, PRECO_OUTPUT_USD)
        _PRECO_CACHE[key] = (resultado[0], resultado[1], now + _PRECO_CACHE_DURATION)
        return resultado

    return 0.0, 0.0


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _parse_periodo(
    periodo: Optional[str] = None,
    de: Optional[str] = None,
    ate: Optional[str] = None,
) -> tuple[datetime, datetime]:
    """Converte parâmetros de período em datetime UTC (de, ate).

    Aceita:
      - periodo='7d'|'30d'|'90d' (relativo a hoje)
      - de + ate em formato ISO (custom)
    Default: 30 dias.
    """
    hoje = datetime.now(timezone.utc)

    if de and ate:
        try:
            periodo_ate = datetime.fromisoformat(ate.replace("Z", "+00:00"))
            periodo_de = datetime.fromisoformat(de.replace("Z", "+00:00"))
            return periodo_de, periodo_ate
        except Exception:
            pass

    dias = 30
    if periodo == "7d":
        dias = 7
    elif periodo == "90d":
        dias = 90
    elif periodo == "30d":
        dias = 30
    elif periodo and periodo.endswith("d"):
        try:
            dias = int(periodo[:-1])
        except ValueError:
            dias = 30

    periodo_de = hoje - timedelta(days=dias)
    return periodo_de, hoje


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value or default)
    except (TypeError, ValueError):
        return default


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return default


MAX_LOGS = 10000


async def _buscar_logs(
    supabase,
    periodo_de: datetime,
    periodo_ate: datetime,
    user_id: Optional[str] = None,
    limit: int = MAX_LOGS,
) -> list[dict]:
    """Busca logs de ai_usage_log no período, opcionalmente filtrado por usuário.

    Args:
        limit: Máximo de linhas retornadas (default 10k). Para agregações o ideal
            seria usar GROUP BY no banco, mas para o volume beta (2026) é suficiente.
    """
    query = (
        supabase.table("ai_usage_log")
        .select("*")
        .gte("created_at", _iso(periodo_de))
        .lte("created_at", _iso(periodo_ate))
    )
    if user_id:
        query = query.eq("user_id", user_id)

    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data or []


async def _buscar_profiles(supabase, user_ids: list[str]) -> dict[str, dict]:
    """Busca profiles por lote. Retorna dict {user_id: profile}."""
    if not user_ids:
        return {}

    profiles: dict[str, dict] = {}
    # Supabase in_ pode ter limite; processa em lotes de 100
    for i in range(0, len(user_ids), 100):
        lote = user_ids[i : i + 100]
        result = (
            supabase.table("profiles")
            .select("id, email, nome, plano, created_at")
            .in_("id", lote)
            .execute()
        )
        for p in result.data or []:
            profiles[p.get("id", "")] = p
    return profiles


# ──────────────────────────────────────────────
#  Resumo geral
# ──────────────────────────────────────────────


async def resumo_uso(
    periodo: Optional[str] = None,
    de: Optional[str] = None,
    ate: Optional[str] = None,
) -> dict:
    """Retorna custo total, série temporal diária, tokens totais e variação vs período anterior."""
    periodo_de, periodo_ate = _parse_periodo(periodo, de, ate)
    duracao = periodo_ate - periodo_de

    supabase = _get_supabase()
    logs = await _buscar_logs(supabase, periodo_de, periodo_ate)

    # Período anterior do mesmo tamanho (para comparação)
    anterior_de = periodo_de - duracao
    anterior_ate = periodo_de
    logs_anterior = await _buscar_logs(supabase, anterior_de, anterior_ate)

    custo_total = 0.0
    tokens_total = 0
    chamadas_total = len(logs)
    custo_por_dia: dict[str, float] = defaultdict(float)

    for log in logs:
        dia = (log.get("created_at") or "")[:10]  # YYYY-MM-DD
        custo = _safe_float(log.get("custo_estimado_usd"))
        inp = _safe_int(log.get("input_tokens"))
        out = _safe_int(log.get("output_tokens"))
        reasoning = _safe_int(log.get("reasoning_tokens"))

        custo_total += custo
        tokens_total += inp + out + reasoning
        custo_por_dia[dia] += custo

    custo_anterior = sum(
        _safe_float(log.get("custo_estimado_usd")) for log in logs_anterior
    )

    variacao_pct = 0.0
    if custo_anterior > 0:
        variacao_pct = round(((custo_total - custo_anterior) / custo_anterior) * 100, 2)

    # Preenche dias sem custo para o gráfico
    serie = []
    dia_atual = periodo_de.date()
    dia_fim = periodo_ate.date()
    while dia_atual <= dia_fim:
        dia_str = dia_atual.isoformat()
        serie.append({
            "data": dia_str,
            "custo": round(custo_por_dia.get(dia_str, 0.0), 6),
        })
        dia_atual += timedelta(days=1)

    return {
        "periodo": {
            "de": periodo_de.date().isoformat(),
            "ate": periodo_ate.date().isoformat(),
        },
        "custo_total_periodo": round(custo_total, 6),
        "custo_por_dia": serie,
        "tokens_totais": tokens_total,
        "chamadas_totais": chamadas_total,
        "custo_periodo_anterior": round(custo_anterior, 6),
        "variacao_percentual": variacao_pct,
    }


# ──────────────────────────────────────────────
#  Custo por feature
# ──────────────────────────────────────────────


async def custo_por_feature(
    periodo: Optional[str] = None,
    de: Optional[str] = None,
    ate: Optional[str] = None,
) -> list[dict]:
    """Retorna custo/tokens/chamadas por feature, ordenado por custo desc."""
    periodo_de, periodo_ate = _parse_periodo(periodo, de, ate)
    supabase = _get_supabase()
    logs = await _buscar_logs(supabase, periodo_de, periodo_ate)

    agregado: dict[str, dict] = {}
    for log in logs:
        feature = log.get("feature", "unknown")
        custo = _safe_float(log.get("custo_estimado_usd"))
        inp = _safe_int(log.get("input_tokens"))
        out = _safe_int(log.get("output_tokens"))
        reasoning = _safe_int(log.get("reasoning_tokens"))

        if feature not in agregado:
            agregado[feature] = {
                "feature": feature,
                "custo_total": 0.0,
                "tokens_total": 0,
                "qtd_chamadas": 0,
            }
        agregado[feature]["custo_total"] += custo
        agregado[feature]["tokens_total"] += inp + out + reasoning
        agregado[feature]["qtd_chamadas"] += 1

    resultado = []
    custo_total_geral = sum(a["custo_total"] for a in agregado.values())
    for item in agregado.values():
        chamadas = item["qtd_chamadas"]
        item["custo_total"] = round(item["custo_total"], 6)
        item["custo_medio_por_chamada"] = round(item["custo_total"] / chamadas, 6) if chamadas else 0.0
        item["percentual_do_total"] = round((item["custo_total"] / custo_total_geral) * 100, 2) if custo_total_geral else 0.0
        resultado.append(item)

    resultado.sort(key=lambda x: x["custo_total"], reverse=True)
    return resultado


# ──────────────────────────────────────────────
#  Custo por usuário
# ──────────────────────────────────────────────


async def custo_por_usuario(
    periodo: Optional[str] = None,
    de: Optional[str] = None,
    ate: Optional[str] = None,
    plano: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """Retorna usuários ordenados por custo total, com métricas de uso."""
    periodo_de, periodo_ate = _parse_periodo(periodo, de, ate)
    supabase = _get_supabase()
    logs = await _buscar_logs(supabase, periodo_de, periodo_ate)

    # Agrega por usuário
    por_user: dict[str, dict] = {}
    for log in logs:
        uid = log.get("user_id")
        if not uid:
            continue
        feature = log.get("feature", "unknown")
        custo = _safe_float(log.get("custo_estimado_usd"))

        if uid not in por_user:
            por_user[uid] = {
                "user_id": uid,
                "custo_total": 0.0,
                "qtd_chamadas": 0,
                "features": defaultdict(float),
            }
        por_user[uid]["custo_total"] += custo
        por_user[uid]["qtd_chamadas"] += 1
        por_user[uid]["features"][feature] += custo

    if not por_user:
        return {"usuarios": [], "total": 0, "limit": limit, "offset": offset}

    # Busca profiles
    profiles = await _buscar_profiles(supabase, list(por_user.keys()))

    resultado = []
    for uid, agg in por_user.items():
        profile = profiles.get(uid, {})
        user_plano = profile.get("plano", "free")

        # Plano filter
        if plano and plano != "todos" and user_plano != plano:
            continue

        feature_mais_usada = ""
        if agg["features"]:
            feature_mais_usada = max(agg["features"], key=agg["features"].get)

        resultado.append({
            "user_id": uid,
            "email": profile.get("email", "-"),
            "nome": profile.get("nome", "-"),
            "plano": user_plano,
            "custo_total": round(agg["custo_total"], 6),
            "qtd_chamadas": agg["qtd_chamadas"],
            "feature_mais_usada": feature_mais_usada,
        })

    resultado.sort(key=lambda x: x["custo_total"], reverse=True)
    total = len(resultado)
    paginado = resultado[offset : offset + limit]

    return {
        "usuarios": paginado,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# ──────────────────────────────────────────────
#  Custo por provider/modelo
# ──────────────────────────────────────────────


async def custo_por_provider(
    periodo: Optional[str] = None,
    de: Optional[str] = None,
    ate: Optional[str] = None,
) -> list[dict]:
    """Retorna custo/chamadas/taxa de erro/latência média por provider+modelo."""
    periodo_de, periodo_ate = _parse_periodo(periodo, de, ate)
    supabase = _get_supabase()
    logs = await _buscar_logs(supabase, periodo_de, periodo_ate)

    agregado: dict[tuple[str, str], dict] = {}
    for log in logs:
        provider = log.get("provider", "unknown")
        model = log.get("model", "unknown")
        key = (provider, model)
        custo = _safe_float(log.get("custo_estimado_usd"))
        status = log.get("status", "sucesso")
        duracao = log.get("duracao_ms")

        if key not in agregado:
            agregado[key] = {
                "provider": provider,
                "model": model,
                "custo_total": 0.0,
                "qtd_chamadas": 0,
                "qtd_erros": 0,
                "latencia_soma": 0,
                "latencia_count": 0,
            }

        agregado[key]["custo_total"] += custo
        agregado[key]["qtd_chamadas"] += 1
        if status in ("erro", "timeout"):
            agregado[key]["qtd_erros"] += 1
        if isinstance(duracao, int):
            agregado[key]["latencia_soma"] += duracao
            agregado[key]["latencia_count"] += 1

    resultado = []
    for item in agregado.values():
        chamadas = item["qtd_chamadas"]
        taxa_erro = round((item["qtd_erros"] / chamadas) * 100, 2) if chamadas else 0.0
        lat_count = item["latencia_count"]
        latencia_media = round(item["latencia_soma"] / lat_count, 0) if lat_count else 0

        resultado.append({
            "provider": item["provider"],
            "model": item["model"],
            "custo_total": round(item["custo_total"], 6),
            "qtd_chamadas": chamadas,
            "taxa_erro_percentual": taxa_erro,
            "latencia_media_ms": int(latencia_media),
        })

    resultado.sort(key=lambda x: x["custo_total"], reverse=True)
    return resultado


# ──────────────────────────────────────────────
#  Outliers de custo
# ──────────────────────────────────────────────


async def outliers(
    periodo: Optional[str] = None,
    de: Optional[str] = None,
    ate: Optional[str] = None,
    desvios: float = 2.0,
) -> dict:
    """Retorna usuários cujo custo está acima de média + N desvios-padrão."""
    periodo_de, periodo_ate = _parse_periodo(periodo, de, ate)
    supabase = _get_supabase()
    logs = await _buscar_logs(supabase, periodo_de, periodo_ate)

    custos_por_user: dict[str, float] = defaultdict(float)
    for log in logs:
        uid = log.get("user_id")
        if uid:
            custos_por_user[uid] += _safe_float(log.get("custo_estimado_usd"))

    valores = list(custos_por_user.values())
    n = len(valores)

    if n == 0:
        return {
            "media": 0.0,
            "desvio_padrao": 0.0,
            "limite": 0.0,
            "outliers": [],
            "amostra": 0,
        }

    media = sum(valores) / n
    # Desvio padrão amostral (usar n-1) se n > 1
    if n > 1:
        variancia = sum((x - media) ** 2 for x in valores) / (n - 1)
        dp = variancia ** 0.5
    else:
        dp = 0.0

    limite = media + (desvios * dp)

    outlier_ids = [uid for uid, custo in custos_por_user.items() if custo > limite]
    profiles = await _buscar_profiles(supabase, outlier_ids)

    outliers_list = []
    for uid in outlier_ids:
        profile = profiles.get(uid, {})
        outliers_list.append({
            "user_id": uid,
            "email": profile.get("email", "-"),
            "nome": profile.get("nome", "-"),
            "plano": profile.get("plano", "free"),
            "custo_total": round(custos_por_user[uid], 6),
        })

    outliers_list.sort(key=lambda x: x["custo_total"], reverse=True)

    return {
        "media": round(media, 6),
        "desvio_padrao": round(dp, 6),
        "limite": round(limite, 6),
        "desvios": desvios,
        "amostra": n,
        "outliers": outliers_list,
    }


# ──────────────────────────────────────────────
#  Economia via cache
# ──────────────────────────────────────────────


async def cache_economia(
    periodo: Optional[str] = None,
    de: Optional[str] = None,
    ate: Optional[str] = None,
) -> dict:
    """Estima quanto foi economizado por cache_hit=true no período."""
    periodo_de, periodo_ate = _parse_periodo(periodo, de, ate)
    supabase = _get_supabase()

    result = (
        supabase.table("ai_usage_log")
        .select("*")
        .eq("cache_hit", True)
        .gte("created_at", _iso(periodo_de))
        .lte("created_at", _iso(periodo_ate))
        .execute()
    )
    logs = result.data or []

    economia_total = 0.0
    por_feature: dict[str, float] = defaultdict(float)
    chamadas_economizadas = 0
    cache_precos: dict[tuple[str, str], tuple[float, float]] = {}

    for log in logs:
        provider = log.get("provider", "openrouter")
        model = log.get("model", DEFAULT_MODEL)
        inp = _safe_int(log.get("input_tokens"))
        out = _safe_int(log.get("output_tokens"))
        feature = log.get("feature", "unknown")

        # Busca preço (com cache em memória — evita N queries)
        key = (provider, model)
        if key not in cache_precos:
            cache_precos[key] = _buscar_preco_com_cache(provider, model)
        preco_in, preco_out = cache_precos[key]

        economia = (inp * preco_in) + (out * preco_out)
        economia_total += economia
        por_feature[feature] += economia
        chamadas_economizadas += 1

    return {
        "economia_total_usd": round(economia_total, 6),
        "chamadas_economizadas": chamadas_economizadas,
        "por_feature": [
            {"feature": k, "economia_usd": round(v, 6)}
            for k, v in sorted(por_feature.items(), key=lambda x: x[1], reverse=True)
        ],
    }


# ──────────────────────────────────────────────
#  Detalhe de uso por usuário
# ──────────────────────────────────────────────


async def detalhe_usuario(
    user_id: str,
    periodo: Optional[str] = None,
    de: Optional[str] = None,
    ate: Optional[str] = None,
) -> dict:
    """Retorna histórico completo de uso de um usuário no período."""
    periodo_de, periodo_ate = _parse_periodo(periodo, de, ate)
    supabase = _get_supabase()

    logs = await _buscar_logs(supabase, periodo_de, periodo_ate, user_id=user_id)

    # Profile
    profile_result = (
        supabase.table("profiles")
        .select("id, email, nome, plano, created_at")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    profile = profile_result.data[0] if profile_result.data else {}

    # Subscription ativa
    sub_result = (
        supabase.table("subscriptions")
        .select("plan, status, current_period_end, created_at")
        .eq("user_id", user_id)
        .in_("status", ["active", "trialing"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    subscription = sub_result.data[0] if sub_result.data else None

    # Breakdown por feature
    por_feature: dict[str, dict] = {}
    for log in logs:
        feature = log.get("feature", "unknown")
        custo = _safe_float(log.get("custo_estimado_usd"))
        inp = _safe_int(log.get("input_tokens"))
        out = _safe_int(log.get("output_tokens"))
        reasoning = _safe_int(log.get("reasoning_tokens"))

        if feature not in por_feature:
            por_feature[feature] = {
                "feature": feature,
                "custo_total": 0.0,
                "qtd_chamadas": 0,
                "tokens_total": 0,
            }
        por_feature[feature]["custo_total"] += custo
        por_feature[feature]["qtd_chamadas"] += 1
        por_feature[feature]["tokens_total"] += inp + out + reasoning

    historico = []
    for log in logs:
        historico.append({
            "id": log.get("id"),
            "feature": log.get("feature", "unknown"),
            "provider": log.get("provider", "unknown"),
            "model": log.get("model", "unknown"),
            "input_tokens": _safe_int(log.get("input_tokens")),
            "output_tokens": _safe_int(log.get("output_tokens")),
            "reasoning_tokens": _safe_int(log.get("reasoning_tokens")),
            "cache_hit": log.get("cache_hit", False),
            "duracao_ms": log.get("duracao_ms"),
            "status": log.get("status", "sucesso"),
            "erro_detalhe": log.get("erro_detalhe"),
            "custo_estimado_usd": _safe_float(log.get("custo_estimado_usd")),
            "created_at": log.get("created_at"),
            "edital_id": log.get("edital_id"),
        })

    return {
        "user_id": user_id,
        "email": profile.get("email", "-"),
        "nome": profile.get("nome", "-"),
        "plano": profile.get("plano", "free"),
        "plano_desde": subscription.get("created_at") if subscription else profile.get("created_at"),
        "subscription": subscription,
        "custo_total_periodo": round(sum(h["custo_estimado_usd"] for h in historico), 6),
        "chamadas_total": len(historico),
        "por_feature": [
            {
                "feature": v["feature"],
                "custo_total": round(v["custo_total"], 6),
                "qtd_chamadas": v["qtd_chamadas"],
                "tokens_total": v["tokens_total"],
            }
            for v in sorted(por_feature.values(), key=lambda x: x["custo_total"], reverse=True)
        ],
        "historico": historico,
    }
