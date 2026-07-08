"""
Router Admin — Painel administrativo da Trilha.

Endpoints protegidos por require_admin (usa ADMIN_EMAILS do .env).
NUNCA usar .single() — usar .limit(1).execute() + check manual.
"""

import logging

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Literal, Optional

from app.middleware.auth import get_current_user, require_admin
from app.services import admin_service, admin_costs_service


class UnsuspendBody(BaseModel):
    plano_original: Literal["free", "estudante", "pro"] = "free"


class PeriodoParams(BaseModel):
    periodo: str = "30d"
    de: Optional[str] = None
    ate: Optional[str] = None


load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
#  GET /api/admin/check — verifica se é admin
# ──────────────────────────────────────────────

@router.get("/check")
async def admin_check(user: dict = Depends(require_admin)):
    """Endpoint para o frontend verificar se o usuário logado é admin."""
    return {"admin": True, "email": user.get("email")}


# ──────────────────────────────────────────────
#  GET /api/admin/stats — métricas globais
# ──────────────────────────────────────────────

@router.get("/stats")
async def get_admin_stats(user: dict = Depends(require_admin)):
    """Retorna estatísticas globais da plataforma."""
    try:
        stats = await admin_service.obter_estatisticas_globais()
        return stats
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas admin: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar estatísticas")


# ──────────────────────────────────────────────
#  GET /api/admin/users — lista usuários
# ──────────────────────────────────────────────

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", description="Busca por email ou nome"),
    user: dict = Depends(require_admin),
):
    """Lista usuários com métricas de uso (paginação + busca)."""
    try:
        resultado = await admin_service.listar_usuarios(
            page=page, limit=limit, search=search
        )
        return resultado
    except Exception as e:
        logger.error(f"Erro ao listar usuários: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar usuários")


# ──────────────────────────────────────────────
#  GET /api/admin/users/{user_id} — detalhes
# ──────────────────────────────────────────────

@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    user: dict = Depends(require_admin),
):
    """Retorna informações detalhadas de um usuário específico."""
    try:
        detalhes = await admin_service.detalhes_usuario(user_id)
        if not detalhes:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        return detalhes
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar detalhes do usuário {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar detalhes do usuário")


# ──────────────────────────────────────────────
#  POST /api/admin/users/{user_id}/suspend
# ──────────────────────────────────────────────

@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    user: dict = Depends(require_admin),
):
    """Suspende um usuário, bloqueando seu acesso à plataforma."""
    try:
        resultado = await admin_service.suspender_usuario(user_id)
        if resultado.get("status") == "error":
            raise HTTPException(status_code=400, detail=resultado.get("message"))
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao suspender usuário {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao suspender usuário")


# ──────────────────────────────────────────────
#  POST /api/admin/users/{user_id}/unsuspend
# ──────────────────────────────────────────────

@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: str,
    body: UnsuspendBody = UnsuspendBody(),
    user: dict = Depends(require_admin),
):
    """Reativa um usuário suspenso. Opcionalmente informa o plano original."""
    try:
        resultado = await admin_service.reativar_usuario(user_id, body.plano_original)
        return resultado
    except Exception as e:
        logger.error(f"Erro ao reativar usuário {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao reativar usuário")


# ──────────────────────────────────────────────
#  POST /api/admin/users/{user_id}/refund
# ──────────────────────────────────────────────

@router.post("/users/{user_id}/refund")
async def refund_user(
    user_id: str,
    user: dict = Depends(require_admin),
):
    """Reembolsa o último pagamento do usuário via Stripe."""
    try:
        resultado = await admin_service.reembolsar_usuario(user_id)
        if resultado.get("status") == "error":
            raise HTTPException(status_code=400, detail=resultado.get("message"))
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao reembolsar usuário {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao reembolsar usuário")


# ──────────────────────────────────────────────
#  Uso e custos de IA — Painel de custos admin
# ──────────────────────────────────────────────


def _periodo_params(
    periodo: str = Query("30d", description="Período: 7d, 30d, 90d ou custom via de/ate"),
    de: Optional[str] = Query(None, description="Data início ISO"),
    ate: Optional[str] = Query(None, description="Data fim ISO"),
) -> PeriodoParams:
    """Extrai parâmetros de período com validação via Pydantic."""
    return PeriodoParams(periodo=periodo, de=de, ate=ate)


@router.get("/uso/resumo")
async def get_uso_resumo(
    params: PeriodoParams = Depends(_periodo_params),
    user: dict = Depends(require_admin),
):
    """Retorna resumo de custos e uso de IA no período."""
    try:
        return await admin_costs_service.resumo_uso(
            periodo=params.periodo, de=params.de, ate=params.ate
        )
    except Exception as e:
        logger.error("Erro ao buscar resumo de uso: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao buscar resumo de uso")


@router.get("/uso/por-feature")
async def get_uso_por_feature(
    params: PeriodoParams = Depends(_periodo_params),
    user: dict = Depends(require_admin),
):
    """Retorna custo/tokens/chamadas por feature."""
    try:
        return await admin_costs_service.custo_por_feature(
            periodo=params.periodo, de=params.de, ate=params.ate
        )
    except Exception as e:
        logger.error("Erro ao buscar custo por feature: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao buscar custo por feature")


@router.get("/uso/por-usuario")
async def get_uso_por_usuario(
    params: PeriodoParams = Depends(_periodo_params),
    plano: str = Query("todos", description="Filtrar por plano: free, estudante, pro, todos"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_admin),
):
    """Retorna custo/chamadas por usuário (ordenado por custo desc)."""
    try:
        return await admin_costs_service.custo_por_usuario(
            periodo=params.periodo,
            de=params.de,
            ate=params.ate,
            plano=plano,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        logger.error("Erro ao buscar custo por usuário: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao buscar custo por usuário")


@router.get("/uso/por-provider")
async def get_uso_por_provider(
    params: PeriodoParams = Depends(_periodo_params),
    user: dict = Depends(require_admin),
):
    """Retorna custo/chamadas/taxa de erro/latência por provider+modelo."""
    try:
        return await admin_costs_service.custo_por_provider(
            periodo=params.periodo, de=params.de, ate=params.ate
        )
    except Exception as e:
        logger.error("Erro ao buscar custo por provider: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao buscar custo por provider")


@router.get("/uso/outliers")
async def get_uso_outliers(
    params: PeriodoParams = Depends(_periodo_params),
    desvios: float = Query(2.0, ge=0.5, le=5.0, description="Número de desvios-padrão acima da média"),
    user: dict = Depends(require_admin),
):
    """Retorna usuários com custo acima de média + N desvios-padrão."""
    try:
        return await admin_costs_service.outliers(
            periodo=params.periodo, de=params.de, ate=params.ate, desvios=desvios
        )
    except Exception as e:
        logger.error("Erro ao buscar outliers de uso: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao buscar outliers de uso")


@router.get("/uso/cache-economia")
async def get_uso_cache_economia(
    params: PeriodoParams = Depends(_periodo_params),
    user: dict = Depends(require_admin),
):
    """Estima economia gerada por cache_hit=true no período."""
    try:
        return await admin_costs_service.cache_economia(
            periodo=params.periodo, de=params.de, ate=params.ate
        )
    except Exception as e:
        logger.error("Erro ao buscar economia de cache: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao buscar economia de cache")


@router.get("/uso/usuario/{user_id}")
async def get_uso_usuario_detalhe(
    user_id: str,
    params: PeriodoParams = Depends(_periodo_params),
    user: dict = Depends(require_admin),
):
    """Retorna histórico completo de uso de um usuário específico."""
    try:
        return await admin_costs_service.detalhe_usuario(
            user_id=user_id,
            periodo=params.periodo,
            de=params.de,
            ate=params.ate,
        )
    except Exception as e:
        logger.error("Erro ao buscar detalhe de uso do usuário %s: %s", user_id, e)
        raise HTTPException(status_code=500, detail="Erro ao buscar detalhe de uso do usuário")
