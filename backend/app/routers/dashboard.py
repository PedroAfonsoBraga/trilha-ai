"""
Router do Dashboard — Visão consolidada do progresso do aluno

Endpoint único GET /api/dashboard que agrega dados de múltiplas fontes:
progresso geral, streak, flashcards, urgência e progresso por concurso.

TODOS os endpoints exigem autenticação via get_current_user.
NUNCA usar .single() — usar .limit(1).execute() + check manual.
"""

import logging
import os

from dotenv import load_dotenv
from fastapi import APIRouter, Depends

from app.middleware.auth import get_current_user
from app.services import dashboard_service

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
async def get_dashboard(user: dict = Depends(get_current_user)):
    """Retorna todos os dados consolidados do dashboard do usuário.

    Cada seção é computada independentemente. Se uma falhar, retorna None
    para ela sem afetar as demais.

    Resposta (200):
        progresso_geral: dict | null — métricas agregadas de todos os documentos
        streak: dict | null — dias consecutivos de estudo
        flashcards: dict | null — métricas de flashcards
        urgencia: dict | null — cards atrasados + prazos próximos
        por_concurso: list | null — progresso por documento
        edital_ativo: dict | null — edital mais recente (nome, banca, data, progresso)
        cronograma_hoje: dict | null — disciplinas do dia com progresso
        disciplinas_risco: list | null — disciplinas que precisam de atenção
        atividade_recente: list | null — timeline de atividades (últimos 30 dias)
    """
    result = await dashboard_service.get_dashboard(user["id"])
    return result
