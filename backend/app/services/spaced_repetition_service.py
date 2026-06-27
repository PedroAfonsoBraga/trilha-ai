"""
Motor de Revisão Espaçada — SM-2 (SuperMemo 2)

Implementação pura do algoritmo SM-2 + orquestração com Supabase
e geração de relatórios de desempenho por tema.

SM-2 spec: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
"""

import logging
import os
from datetime import datetime, timedelta

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


# ──────────────────────────────────────────────
#  Motor SM-2 puro (função sem I/O)
# ──────────────────────────────────────────────

def calcular_sm2(
    quality: int,
    easiness_factor: float = 2.5,
    repetitions: int = 0,
    interval_days: int = 1,
) -> dict:
    """Executa o algoritmo SM-2 e retorna os novos parâmetros.

    Args:
        quality: Nota da revisão (0-5). No MVP usamos 1=Errei, 3=Difícil, 5=Fácil.
        easiness_factor: Fator de facilidade atual (default 2.5).
        repetitions: Número de repetições consecutivas bem-sucedidas (default 0).
        interval_days: Intervalo atual em dias (default 1).

    Returns:
        Dicionário com easiness_factor, repetitions, interval_days e next_review (ISO).
    """
    if quality >= 3:
        # Acerto
        if repetitions == 0:
            new_interval = 1
        elif repetitions == 1:
            new_interval = 6
        else:
            new_interval = round(interval_days * easiness_factor)
        new_repetitions = repetitions + 1
    else:
        # Lapso (erro)
        new_interval = 1
        new_repetitions = 0

    # Atualiza easiness factor (fórmula SM-2)
    new_ef = easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if new_ef < 1.3:
        new_ef = 1.3

    next_review = datetime.utcnow() + timedelta(days=new_interval)
    # Arredonda para o início do próximo dia útil (00:00 UTC)
    next_review = next_review.replace(hour=0, minute=0, second=0, microsecond=0)

    return {
        "easiness_factor": round(new_ef, 4),
        "repetitions": new_repetitions,
        "interval_days": new_interval,
        "next_review": next_review.isoformat() + "Z",
    }


# ──────────────────────────────────────────────
#  Orquestração com Supabase
# ──────────────────────────────────────────────

def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


async def revisar_flashcard(
    user_id: str,
    flashcard_id: str,
    quality: int,
) -> dict:
    """Revisa um flashcard: aplica SM-2, atualiza DB e registra histórico.

    Args:
        user_id: ID do usuário autenticado.
        flashcard_id: ID do flashcard a ser revisado.
        quality: Nota da revisão (1, 3 ou 5).

    Returns:
        Flashcard atualizado (dict).
    """
    supabase = _get_supabase()

    # 1. Busca o flashcard (com segurança de user_id)
    result = (
        supabase.table("flashcards")
        .select("*")
        .eq("id", flashcard_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise ValueError("Flashcard não encontrado")

    card = result.data[0]

    # 2. Salva snapshot BEFORE
    ef_before = card.get("easiness_factor", 2.5)
    reps_before = card.get("repetitions", 0)
    interval_before = card.get("interval_days", 1)

    # 3. Executa SM-2
    sm2_result = calcular_sm2(
        quality=quality,
        easiness_factor=ef_before,
        repetitions=reps_before,
        interval_days=interval_before,
    )

    # 4. Atualiza o flashcard
    update_data = {
        "easiness_factor": sm2_result["easiness_factor"],
        "repetitions": sm2_result["repetitions"],
        "interval_days": sm2_result["interval_days"],
        "next_review": sm2_result["next_review"],
    }
    supabase.table("flashcards").update(update_data).eq("id", flashcard_id).eq("user_id", user_id).execute()

    # 5. Insere no histórico
    supabase.table("flashcard_reviews").insert({
        "user_id": user_id,
        "flashcard_id": flashcard_id,
        "quality": quality,
        "easiness_factor_before": ef_before,
        "easiness_factor_after": sm2_result["easiness_factor"],
        "interval_days_before": interval_before,
        "interval_days_after": sm2_result["interval_days"],
        "repetitions_before": reps_before,
        "repetitions_after": sm2_result["repetitions"],
    }).execute()

    logger.info(
        "Flashcard %s revisado (quality=%d): EF %.2f→%.2f, interval %d→%d, reps %d→%d",
        flashcard_id, quality,
        ef_before, sm2_result["easiness_factor"],
        interval_before, sm2_result["interval_days"],
        reps_before, sm2_result["repetitions"],
    )

    # 6. Retorna card atualizado (mescla dados originais + novos)
    card.update(update_data)
    return card


# ──────────────────────────────────────────────
#  Relatório de desempenho
# ──────────────────────────────────────────────

def gerar_relatorio_desempenho(
    reviews: list[dict],
    flashcards: list[dict],
) -> dict:
    """Gera relatório de desempenho agregado por tag/tema.

    Args:
        reviews: Lista de objetos flashcard_reviews.
        flashcards: Lista de objetos flashcards (com tags).

    Returns:
        Dicionário com geral (métricas globais) e por_tag (breakdown).
    """
    if not reviews or not flashcards:
        return _relatorio_vazio()

    # Mapa flashcard_id -> tags
    card_tags: dict[str, list[str]] = {}
    for fc in flashcards:
        card_tags[fc["id"]] = fc.get("tags", []) or []

    tag_stats: dict[str, dict] = {}
    total_reviews = len(reviews)
    total_acertos = 0
    total_quality = 0.0

    for review in reviews:
        fc_id = review["flashcard_id"]
        quality = review.get("quality", 0)
        total_quality += quality
        if quality >= 3:
            total_acertos += 1

        tags = card_tags.get(fc_id, ["sem_tag"])
        for tag in tags:
            if tag not in tag_stats:
                tag_stats[tag] = {
                    "total_reviews": 0,
                    "total_quality": 0.0,
                    "acertos": 0,
                    "erros": 0,
                    "cards_count": 0,
                }
            tag_stats[tag]["total_reviews"] += 1
            tag_stats[tag]["total_quality"] += quality
            if quality >= 3:
                tag_stats[tag]["acertos"] += 1
            else:
                tag_stats[tag]["erros"] += 1

    # Conta cards únicos por tag
    tag_card_ids: dict[str, set] = {}
    for fc_id, tags in card_tags.items():
        for tag in tags:
            tag_name = tag if tag else "sem_tag"
            if tag_name not in tag_card_ids:
                tag_card_ids[tag_name] = set()
            tag_card_ids[tag_name].add(fc_id)

    for tag, stats in tag_stats.items():
        stats["avg_quality"] = round(stats["total_quality"] / stats["total_reviews"], 2) if stats["total_reviews"] > 0 else 0
        stats["cards_count"] = len(tag_card_ids.get(tag, set()))
        del stats["total_quality"]  # remove campo bruto

    # Métricas globais
    agora = datetime.utcnow()
    cards_due_today = sum(
        1 for fc in flashcards
        if fc.get("next_review") and _parse_dt(fc["next_review"]) <= agora
    )
    cards_mastered = sum(
        1 for fc in flashcards
        if fc.get("interval_days", 0) >= 21
    )
    cards_learning = len(flashcards) - cards_mastered
    avg_ef = sum(
        fc.get("easiness_factor", 2.5) for fc in flashcards
    ) / len(flashcards) if flashcards else 2.5

    return {
        "geral": {
            "total_cards": len(flashcards),
            "total_reviews": total_reviews,
            "avg_easiness": round(avg_ef, 2),
            "avg_quality": round(total_quality / total_reviews, 2) if total_reviews > 0 else 0,
            "acertos": total_acertos,
            "erros": total_reviews - total_acertos,
            "precisao": round(total_acertos / total_reviews * 100, 1) if total_reviews > 0 else 0,
            "cards_mastered": cards_mastered,
            "cards_learning": cards_learning,
            "cards_due_today": cards_due_today,
        },
        "por_tag": dict(sorted(
            tag_stats.items(),
            key=lambda x: x[1]["total_reviews"],
            reverse=True,
        )),
    }


def _relatorio_vazio() -> dict:
    return {
        "geral": {
            "total_cards": 0,
            "total_reviews": 0,
            "avg_easiness": 2.5,
            "avg_quality": 0,
            "acertos": 0,
            "erros": 0,
            "precisao": 0,
            "cards_mastered": 0,
            "cards_learning": 0,
            "cards_due_today": 0,
        },
        "por_tag": {},
    }


def _parse_dt(iso_str: str) -> datetime:
    """Tenta parsear ISO datetime, com fallback para now()."""
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return datetime.utcnow()
