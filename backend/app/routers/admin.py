"""
Router Admin — Painel administrativo da Trilha.

Endpoints protegidos por require_admin (usa ADMIN_EMAILS do .env).
NUNCA usar .single() — usar .limit(1).execute() + check manual.
"""

import logging

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Literal

from app.middleware.auth import get_current_user, require_admin
from app.services import admin_service


class UnsuspendBody(BaseModel):
    plano_original: Literal["free", "estudante", "pro"] = "free"

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
