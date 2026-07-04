"""
Router de Usuário — Custos e LGPD

Endpoints:
- GET  /api/user/costs — custo de IA por feature/modelo (mês atual)
- DELETE /api/user    — exclusão total de dados (LGPD)

TODOS os endpoints exigem autenticação via get_current_user.
NUNCA usar .single() — usar .limit(1).execute() + check manual.
"""

import logging
import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import get_current_user

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# ──────────────────────────────────────────────
#  GET /api/user/costs
# ──────────────────────────────────────────────

@router.get("/costs")
async def get_user_costs(user: dict = Depends(get_current_user)):
    """Retorna custos de IA do usuário no mês atual.

    Agrega dados da tabela ai_usage_log por feature e modelo.
    Inclui orçamento mensal baseado no plano do usuário.
    """
    supabase = _get_supabase()

    hoje = datetime.now(timezone.utc)
    inicio_mes = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Busca logs do mês atual
    result = (
        supabase.table("ai_usage_log")
        .select("*")
        .eq("user_id", user["id"])
        .gte("created_at", inicio_mes.isoformat())
        .order("created_at", desc=True)
        .execute()
    )
    logs = result.data or []

    # Agregações
    total_input_tokens = 0
    total_output_tokens = 0
    total_custo_usd = 0.0
    por_feature: dict[str, dict] = {}
    por_modelo: dict[str, dict] = {}
    total_chamadas = len(logs)

    for log in logs:
        feature = log.get("feature", "unknown")
        modelo = log.get("model", "unknown")
        inp = log.get("input_tokens", 0) or 0
        out = log.get("output_tokens", 0) or 0
        custo = float(log.get("custo_estimado_usd", 0) or 0)

        total_input_tokens += inp
        total_output_tokens += out
        total_custo_usd += custo

        # Por feature
        if feature not in por_feature:
            por_feature[feature] = {
                "chamadas": 0, "input_tokens": 0, "output_tokens": 0, "custo_usd": 0.0,
            }
        por_feature[feature]["chamadas"] += 1
        por_feature[feature]["input_tokens"] += inp
        por_feature[feature]["output_tokens"] += out
        por_feature[feature]["custo_usd"] += custo

        # Por modelo
        if modelo not in por_modelo:
            por_modelo[modelo] = {"chamadas": 0, "custo_usd": 0.0}
        por_modelo[modelo]["chamadas"] += 1
        por_modelo[modelo]["custo_usd"] += custo

    # Orçamento baseado no plano
    plano = await _get_plano(user["id"])
    orcamento_mensal_usd = _orcamento_por_plano(plano)

    # Arredonda valores
    for f in por_feature.values():
        f["custo_usd"] = round(f["custo_usd"], 6)
    for m in por_modelo.values():
        m["custo_usd"] = round(m["custo_usd"], 6)

    total_custo_usd = round(total_custo_usd, 6)
    total_custo_brl = round(total_custo_usd * 5.50, 2)

    return {
        "periodo": {
            "inicio": inicio_mes.date().isoformat(),
            "fim": hoje.date().isoformat(),
        },
        "total_chamadas": total_chamadas,
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "total_custo_usd": total_custo_usd,
        "total_custo_brl": total_custo_brl,
        "por_feature": por_feature,
        "por_modelo": por_modelo,
        "orcamento_mensal_usd": orcamento_mensal_usd,
        "dentro_do_orcamento": total_custo_usd <= orcamento_mensal_usd,
    }


async def _get_plano(user_id: str) -> str:
    """Obtém o plano do usuário (subscriptions > profiles fallback)."""
    supabase = _get_supabase()
    sub = (
        supabase.table("subscriptions")
        .select("plan, status")
        .eq("user_id", user_id)
        .execute()
    )
    if sub.data:
        for s in sub.data:
            if s.get("status") in ("active", "trialing"):
                return s.get("plan", "free")

    profile = (
        supabase.table("profiles")
        .select("plano")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if profile.data:
        return profile.data[0].get("plano", "free")
    return "free"


def _orcamento_por_plano(plano: str) -> float:
    """Orçamento mensal de IA por plano em USD."""
    orcamentos = {
        "free": 0.50,       # ~R$2,75/mês
        "estudante": 3.00,  # ~R$16,50/mês
        "pro": 10.00,       # ~R$55,00/mês
    }
    return orcamentos.get(plano, 0.50)


# ──────────────────────────────────────────────
#  DELETE /api/user — LGPD
# ──────────────────────────────────────────────

TABELAS_COM_USER_ID = [
    "flashcard_reviews",
    "flashcards",
    "document_chunks",
    "student_progress",
    "shared_exports",
    "chat_messages",
    "chat_sessions",
    "documents",
    "notification_preferences",
    "usage_tracking",
    "ai_usage_log",
    "subscriptions",
    "profiles",
]


@router.delete("/")
async def delete_user_data(user: dict = Depends(get_current_user)):
    """Exclui todos os dados do usuário (LGPD).

    Ordem de deleção:
    1. Storage: documentos e exports do usuário
    2. Tabelas com user_id (na ordem de FK para evitar violações)
    3. Auth: remove o usuário do Supabase Auth

    É idempotente — segunda chamada retorna 200 com already_deleted.
    """
    user_id = user["id"]
    supabase = _get_supabase()

    # Verifica se já foi deletado (profiles já removido)
    check = (
        supabase.table("profiles")
        .select("id")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    already_deleted = not check.data

    if already_deleted:
        logger.info("Usuário %s já foi deletado anteriormente", user_id)
        return {
            "status": "deleted",
            "user_id": user_id,
            "already_deleted": True,
        }

    # 1. Storage
    storage_files_removed = 0
    for bucket in ("documents", "exports"):
        try:
            # Lista objetos no bucket com prefixo do user_id
            objects = supabase.storage.from_(bucket).list(path=user_id)
            if objects:
                paths = [f"{user_id}/{obj['name']}" for obj in objects]
                supabase.storage.from_(bucket).remove(paths)
                storage_files_removed += len(paths)
                logger.info(
                    "Storage removido: bucket=%s user=%s files=%d",
                    bucket, user_id, len(paths),
                )
        except Exception as e:
            logger.warning("Erro ao limpar storage bucket=%s: %s", bucket, e)

    # 2. Tabelas com user_id (na ordem de FK)
    tabelas_limpas = 0
    for tabela in TABELAS_COM_USER_ID:
        try:
            supabase.table(tabela).delete().eq("user_id", user_id).execute()
            tabelas_limpas += 1
        except Exception as e:
            logger.warning("Erro ao deletar de %s: %s", tabela, e)

    # 3. Auth — remove o usuário do Supabase Auth
    try:
        supabase.auth.admin.delete_user(user_id)
        logger.info("Usuário removido do Auth: %s", user_id)
    except Exception as e:
        logger.error("Erro ao deletar user do Auth: %s", e)
        # Não levanta exceção — o user já foi deletado das tabelas

    logger.info(
        "Usuário %s deletado: %d tabelas limpas, %d arquivos storage",
        user_id, tabelas_limpas, storage_files_removed,
    )

    return {
        "status": "deleted",
        "user_id": user_id,
        "already_deleted": False,
        "tables_cleaned": tabelas_limpas,
        "storage_files_removed": storage_files_removed,
    }
