"""
Router de Revisão Espaçada — flashcards

Endpoints para sessão de revisão SM-2.

TODOS os endpoints exigem autenticação via get_current_user.
NUNCA usar .single() — usar .limit(1).execute() + check manual.
"""

import logging
import os
from datetime import datetime, timedelta

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import get_current_user
from app.services import spaced_repetition_service as srs

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


@router.get("/due")
async def list_due_flashcards(user: dict = Depends(get_current_user)):
    """Lista flashcards pendentes de revisão (next_review <= now), ordenados por urgência.

    Retorna no máximo 50 cards por sessão para evitar sobrecarga.
    """
    supabase = _get_supabase()
    agora = datetime.utcnow().isoformat()

    result = (
        supabase.table("flashcards")
        .select("*")
        .eq("user_id", user["id"])
        .lte("next_review", agora)
        .order("next_review", desc=False)
        .limit(50)
        .execute()
    )

    cards = result.data or []

    return {
        "cards": cards,
        "total": len(cards),
    }


@router.post("/{flashcard_id}/review")
async def review_flashcard(
    flashcard_id: str,
    body: dict,
    user: dict = Depends(get_current_user),
):
    """Registra uma revisão e executa o algoritmo SM-2.

    Body:
        quality (int): 1 (Errei), 3 (Difícil) ou 5 (Fácil).

    Retorna o flashcard atualizado com os novos parâmetros SM-2.
    """
    quality = body.get("quality")
    if quality not in (1, 3, 5):
        raise HTTPException(
            status_code=400,
            detail="quality deve ser 1 (Errei), 3 (Difícil) ou 5 (Fácil)",
        )

    try:
        updated_card = await srs.revisar_flashcard(
            user_id=user["id"],
            flashcard_id=flashcard_id,
            quality=quality,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {"card": updated_card}


@router.get("/{flashcard_id}/history")
async def get_flashcard_history(
    flashcard_id: str,
    user: dict = Depends(get_current_user),
):
    """Retorna o histórico de revisões de um flashcard específico."""
    supabase = _get_supabase()

    # Verifica se o flashcard pertence ao usuário
    card_check = (
        supabase.table("flashcards")
        .select("id")
        .eq("id", flashcard_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not card_check.data:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")

    result = (
        supabase.table("flashcard_reviews")
        .select("*")
        .eq("flashcard_id", flashcard_id)
        .order("reviewed_at", desc=True)
        .execute()
    )

    return {"reviews": result.data or [], "total": len(result.data or [])}


@router.get("/report")
async def get_performance_report(user: dict = Depends(get_current_user)):
    """Relatório de desempenho agregado por tag/tema.

    Inclui:
    - Métricas globais (cards dominados, em aprendizado, pendentes)
    - Breakdown por tag (total reviews, precisão, cards por tag)
    """
    supabase = _get_supabase()

    # Busca todos os flashcards do usuário
    fc_result = (
        supabase.table("flashcards")
        .select("*")
        .eq("user_id", user["id"])
        .execute()
    )
    flashcards = fc_result.data or []

    # Busca últimas revisões (últimos 90 dias para performance)
    noventa_dias_atras = datetime.utcnow() - timedelta(days=90)

    review_result = (
        supabase.table("flashcard_reviews")
        .select("*")
        .eq("user_id", user["id"])
        .gte("reviewed_at", noventa_dias_atras.isoformat())
        .order("reviewed_at", desc=True)
        .execute()
    )
    reviews = review_result.data or []

    report = srs.gerar_relatorio_desempenho(
        reviews=reviews,
        flashcards=flashcards,
    )

    return report
