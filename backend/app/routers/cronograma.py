"""
Router de cronograma por tópicos.

Endpoints:
  POST /api/cronograma/gerar
  GET  /api/cronograma/{edital_id}
  GET  /api/cronograma/{edital_id}/hoje
  GET  /api/cronograma/{edital_id}/export.ics
  PATCH /api/cronograma/topico/{bloco_id}
"""

import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response

from app.middleware.auth import get_current_user
from app.models.cronograma import (
    Cronograma,
    DaySchedule,
    GerarCronogramaRequest,
    TopicBlock,
    UpdateBlocoRequest,
    UserConfig,
)
from app.services import ics_service, rate_limiter
from app.services.cronograma import build_cronograma, distribute_topics, extract_topics_from_edital

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _fetch_doc(doc_id: str, user_id: str, select: str = "*"):
    supabase = _get_supabase()
    result = (
        supabase.table("documents")
        .select(select)
        .eq("id", doc_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def _load_edital_markdown(doc_id: str, user_id: str) -> str:
    doc = _fetch_doc(doc_id, user_id, select="markdown_text, texto_extraido, metadata")
    if not doc:
        raise HTTPException(status_code=404, detail="Edital não encontrado")

    markdown = doc.get("markdown_text")
    if markdown:
        return markdown

    metadata = doc.get("metadata") or {}
    markdown = metadata.get("markdown_text")
    if markdown:
        return markdown

    texto = doc.get("texto_extraido")
    if texto:
        return texto

    raise HTTPException(status_code=400, detail="Edital sem conteúdo disponível")


def _save_cronograma(user_id: str, edital_id: str, cronograma: Cronograma) -> None:
    """Persiste config e blocos no banco."""
    supabase = _get_supabase()

    # Salva config
    config_data = {
        "user_id": user_id,
        "edital_id": edital_id,
        "dias_da_semana": cronograma.config.dias_da_semana,
        "horas_por_dia": cronograma.config.horas_por_dia,
        "reservar_revisao": cronograma.config.reservar_revisao,
        "nivel_disciplinas": cronograma.config.nivel_por_disciplina,
    }
    existing = (
        supabase.table("cronograma_config")
        .select("id")
        .eq("user_id", user_id)
        .eq("edital_id", edital_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        supabase.table("cronograma_config").update(config_data).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("cronograma_config").insert(config_data).execute()

    # Remove blocos antigos não concluídos; concluídos são mantidos como histórico
    supabase.table("cronograma_blocos").delete().eq("user_id", user_id).eq("edital_id", edital_id).neq("status", "concluido").execute()

    # Insere novos blocos
    inserts = []
    for semana_idx, semana in enumerate(cronograma.semanas):
        for dia in semana:
            for ordem, bloco in enumerate(dia.blocos):
                inserts.append({
                    "user_id": user_id,
                    "edital_id": edital_id,
                    "disciplina": bloco.disciplina,
                    "topico": bloco.topico,
                    "data": dia.date.isoformat(),
                    "duracao_min": bloco.duracao_min,
                    "status": bloco.status,
                    "ordem_no_dia": ordem,
                })
    if inserts:
        supabase.table("cronograma_blocos").insert(inserts).execute()


def _load_blocos_ativos(user_id: str, edital_id: str) -> list[TopicBlock]:
    """Carrega blocos não concluídos atuais."""
    supabase = _get_supabase()
    result = (
        supabase.table("cronograma_blocos")
        .select("disciplina, topico, data, duracao_min, status")
        .eq("user_id", user_id)
        .eq("edital_id", edital_id)
        .neq("status", "concluido")
        .order("data, ordem_no_dia")
        .execute()
    )
    return [
        TopicBlock(
            disciplina=row["disciplina"],
            topico=row["topico"],
            duracao_min=row["duracao_min"],
            status=row["status"],
        )
        for row in (result.data or [])
    ]


def _load_blocos_concluidos(user_id: str, edital_id: str) -> list[TopicBlock]:
    supabase = _get_supabase()
    result = (
        supabase.table("cronograma_blocos")
        .select("disciplina, topico, data, duracao_min, status")
        .eq("user_id", user_id)
        .eq("edital_id", edital_id)
        .eq("status", "concluido")
        .execute()
    )
    return [
        TopicBlock(
            disciplina=row["disciplina"],
            topico=row["topico"],
            duracao_min=row["duracao_min"],
            status=row["status"],
        )
        for row in (result.data or [])
    ]


def _load_cronograma_from_db(user_id: str, edital_id: str) -> Optional[Cronograma]:
    supabase = _get_supabase()

    config_result = (
        supabase.table("cronograma_config")
        .select("*")
        .eq("user_id", user_id)
        .eq("edital_id", edital_id)
        .limit(1)
        .execute()
    )
    if not config_result.data:
        return None

    config_row = config_result.data[0]
    config = UserConfig(
        dias_da_semana=config_row["dias_da_semana"],
        horas_por_dia=float(config_row["horas_por_dia"]),
        nivel_por_disciplina=config_row.get("nivel_disciplinas") or {},
        reservar_revisao=config_row["reservar_revisao"],
        data_prova=date.fromisoformat(str(config_row.get("data_prova"))) if config_row.get("data_prova") else date.today(),
    )

    blocos_result = (
        supabase.table("cronograma_blocos")
        .select("id, disciplina, topico, data, duracao_min, status, ordem_no_dia")
        .eq("user_id", user_id)
        .eq("edital_id", edital_id)
        .order("data, ordem_no_dia")
        .execute()
    )

    dias_map: dict[str, DaySchedule] = {}
    for row in (blocos_result.data or []):
        data_str = row["data"]
        if data_str not in dias_map:
            dias_map[data_str] = DaySchedule(date=date.fromisoformat(data_str))
        dias_map[data_str].blocos.append(TopicBlock(
            id=str(row["id"]),
            disciplina=row["disciplina"],
            topico=row["topico"],
            duracao_min=row["duracao_min"],
            status=row["status"],
        ))
        dias_map[data_str].total_minutos += row["duracao_min"]

    if not dias_map:
        return None

    # Agrupa em semanas
    dias_ordenados = sorted(dias_map.values(), key=lambda d: d.date)
    semanas: list[list[DaySchedule]] = []
    primeiro_dia = dias_ordenados[0].date
    for ds in dias_ordenados:
        semana_num = (ds.date - primeiro_dia).days // 7
        while len(semanas) <= semana_num:
            semanas.append([])
        semanas[semana_num].append(ds)

    return Cronograma(
        edital_id=edital_id,
        user_id=user_id,
        semanas=semanas,
        gerado_em=datetime.now(timezone.utc).isoformat(),
        config=config,
    )


def _cronograma_to_ics_list(cronograma: Cronograma) -> list[dict]:
    """Converte cronograma por tópicos para o formato esperado por ics_service."""
    items = []
    for semana_idx, semana in enumerate(cronograma.semanas):
        for dia in semana:
            for bloco in dia.blocos:
                items.append({
                    "semana": semana_idx + 1,
                    "periodo": dia.date.isoformat(),
                    "disciplina": bloco.disciplina,
                    "topico": bloco.topico,
                    "horas": round(bloco.duracao_min / 60, 2),
                })
    return items


@router.post("/gerar")
async def gerar_cronograma(
    request: GerarCronogramaRequest,
    user: dict = Depends(get_current_user),
):
    edital_id = request.edital_id
    user_config = request.user_config

    doc = _fetch_doc(edital_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Edital não encontrado")

    if doc.get("tipo") != "edital":
        raise HTTPException(status_code=400, detail="Apenas documentos do tipo 'edital' podem ter cronograma por tópico")

    # Regra de negócio: ao menos 7 dias até a prova
    hoje = date.today()
    if (user_config.data_prova - hoje).days < 7:
        raise HTTPException(status_code=400, detail="Cronograma só pode ser gerado com pelo menos 7 dias até a prova")

    # Rate limit para geração de cronograma (feature "cronograma")
    if not rate_limiter.check_rate_limit(user["id"], "cronograma", max_free=5):
        raise HTTPException(status_code=429, detail="Limite de gerações de cronograma atingido para o plano Free")

    markdown = _load_edital_markdown(edital_id, user["id"])

    # Fallback compartilhado: gera cronograma por disciplina quando não é possível extrair tópicos
    def _fallback_por_disciplina(aviso: str) -> dict:
        from app.services import schedule_generator
        parsed = (doc.get("metadata") or {}).get("parsed") or {}
        cronograma_disciplinas = schedule_generator.gerar_cronograma(
            disciplinas=parsed.get("disciplinas", []),
            data_prova=user_config.data_prova.isoformat(),
            horas_semana=int(user_config.horas_por_dia * len(user_config.dias_da_semana)),
        )
        return {
            "fallback": True,
            "aviso": aviso,
            "cronograma_por_disciplina": cronograma_disciplinas,
        }

    try:
        extracted = await extract_topics_from_edital(edital_id, markdown, user["id"])
    except Exception as e:
        logger.error("Falha ao extrair tópicos para edital %s: %s", edital_id[:8], e)
        return _fallback_por_disciplina(
            "Não foi possível extrair tópicos do edital. O cronograma foi gerado por disciplina."
        )

    # Se nenhum tópico encontrado, fallback gera cronograma por disciplina
    total_topicos = sum(len(d.topicos) for d in extracted.disciplinas)
    if total_topicos == 0:
        logger.warning("Edital %s sem tópicos — fallback por disciplina", edital_id[:8])
        return _fallback_por_disciplina(
            "Seu edital não lista tópicos detalhados. O cronograma foi gerado por disciplina."
        )

    distribution = distribute_topics(extracted.disciplinas, user_config)

    blocos_concluidos = _load_blocos_concluidos(user["id"], edital_id)
    semanas = build_cronograma(distribution, user_config, blocos_concluidos)

    cronograma = Cronograma(
        edital_id=edital_id,
        user_id=user["id"],
        semanas=semanas,
        gerado_em=datetime.now(timezone.utc).isoformat(),
        config=user_config,
    )

    _save_cronograma(user["id"], edital_id, cronograma)

    if doc.get("tipo") == "edital":
        rate_limiter.increment_usage(user["id"], "cronograma")

    return {
        "fallback": False,
        "aviso": distribution.get("aviso"),
        "has_vague_topics": extracted.has_vague_topics,
        "cronograma": cronograma,
    }


@router.get("/{edital_id}")
async def get_cronograma(edital_id: str, user: dict = Depends(get_current_user)):
    cronograma = _load_cronograma_from_db(user["id"], edital_id)
    # Retorna None se não existir — é um estado esperado (empty state),
    # não um erro. O frontend trata null como "nenhum cronograma gerado".
    return cronograma


@router.get("/{edital_id}/hoje")
async def get_cronograma_hoje(edital_id: str, user: dict = Depends(get_current_user)):
    supabase = _get_supabase()
    hoje = date.today().isoformat()
    result = (
        supabase.table("cronograma_blocos")
        .select("disciplina, topico, duracao_min, status")
        .eq("user_id", user["id"])
        .eq("edital_id", edital_id)
        .eq("data", hoje)
        .order("ordem_no_dia")
        .execute()
    )

    blocos = result.data or []
    total_minutos = sum(b["duracao_min"] for b in blocos)

    return {
        "edital_id": edital_id,
        "data": hoje,
        "total_minutos": total_minutos,
        "blocos": blocos,
    }


@router.get("/{edital_id}/export.ics")
async def export_ics(edital_id: str, user: dict = Depends(get_current_user)):
    cronograma = _load_cronograma_from_db(user["id"], edital_id)
    if not cronograma:
        raise HTTPException(status_code=404, detail="Cronograma não encontrado")

    items = _cronograma_to_ics_list(cronograma)
    if not items:
        raise HTTPException(status_code=400, detail="Cronograma vazio")

    plano = rate_limiter.get_user_plan(user["id"])
    ics_bytes = ics_service.criar_calendario_ics(items, titulo="Cronograma de Estudos", plano=plano)

    return Response(
        content=ics_bytes,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=cronograma_{edital_id[:8]}.ics"
        },
    )


@router.patch("/topico/{bloco_id}")
async def atualizar_topico(
    bloco_id: str,
    request: UpdateBlocoRequest,
    user: dict = Depends(get_current_user),
):
    supabase = _get_supabase()

    # Busca bloco sem .single()
    result = (
        supabase.table("cronograma_blocos")
        .select("*")
        .eq("id", bloco_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Bloco não encontrado")

    bloco = result.data[0]
    edital_id = bloco["edital_id"]

    update_data: dict = {}
    if request.status is not None:
        update_data["status"] = request.status
    if request.duracao_min is not None:
        update_data["duracao_min"] = request.duracao_min
    if request.nova_data is not None:
        update_data["data"] = request.nova_data.isoformat()

    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        supabase.table("cronograma_blocos").update(update_data).eq("id", bloco_id).execute()

    # Se bloco foi pulado, cria novo bloco no próximo dia disponível
    if request.status == "pulado":
        config_result = (
            supabase.table("cronograma_config")
            .select("dias_da_semana")
            .eq("user_id", user["id"])
            .eq("edital_id", edital_id)
            .limit(1)
            .execute()
        )
        if config_result.data:
            dias_da_semana = set(config_result.data[0]["dias_da_semana"])
            data_original = date.fromisoformat(str(bloco["data"]))
            proximo_dia = data_original + timedelta(days=1)
            while (proximo_dia.weekday() + 1) not in dias_da_semana:
                proximo_dia += timedelta(days=1)

            # Reutiliza tópico e disciplina
            supabase.table("cronograma_blocos").insert({
                "user_id": user["id"],
                "edital_id": edital_id,
                "disciplina": bloco["disciplina"],
                "topico": bloco["topico"],
                "data": proximo_dia.isoformat(),
                "duracao_min": bloco["duracao_min"],
                "status": "pendente",
                "ordem_no_dia": 0,
            }).execute()

    # Retorna cronograma atualizado
    cronograma = _load_cronograma_from_db(user["id"], edital_id)
    return cronograma
