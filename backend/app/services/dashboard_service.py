"""
Dashboard — Visão consolidada do progresso do aluno

Agrega dados de múltiplas fontes para exibir no dashboard inicial:
- Progresso geral (todos os documentos)
- Streak de estudo (dias consecutivos)
- Flashcards pendentes + métricas
- Modo urgência (cards atrasados + prazos próximos)
- Progresso por concurso/documento

NENHUM método usa .single() — seguimos .limit(1).execute() + check manual.
"""

import logging
import os
from datetime import date, datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# ──────────────────────────────────────────────
#  Orquestrador principal
# ──────────────────────────────────────────────

async def get_dashboard(user_id: str) -> dict:
    """Gera todos os dados do dashboard para um usuário.

    Cada seção é computada em try/except independente.
    Se uma seção falhar, retorna None para ela — as demais continuam.
    """
    resultado = {}

    # Progresso geral
    try:
        resultado["progresso_geral"] = _get_progresso_geral(user_id)
    except Exception as e:
        logger.error("Erro ao computar progresso_geral para user %s: %s", user_id, e)
        resultado["progresso_geral"] = None

    # Streak de estudo
    try:
        resultado["streak"] = _get_streak(user_id)
    except Exception as e:
        logger.error("Erro ao computar streak para user %s: %s", user_id, e)
        resultado["streak"] = None

    # Flashcards
    try:
        resultado["flashcards"] = _get_flashcards_stats(user_id)
    except Exception as e:
        logger.error("Erro ao computar flashcards para user %s: %s", user_id, e)
        resultado["flashcards"] = None

    # Urgência
    try:
        resultado["urgencia"] = _get_urgencia(user_id)
    except Exception as e:
        logger.error("Erro ao computar urgencia para user %s: %s", user_id, e)
        resultado["urgencia"] = None

    # Por concurso
    try:
        resultado["por_concurso"] = _get_por_concurso(user_id)
    except Exception as e:
        logger.error("Erro ao computar por_concurso para user %s: %s", user_id, e)
        resultado["por_concurso"] = None

    # Edital ativo
    try:
        resultado["edital_ativo"] = _get_edital_ativo(user_id)
    except Exception as e:
        logger.error("Erro ao computar edital_ativo para user %s: %s", user_id, e)
        resultado["edital_ativo"] = None

    # Cronograma de hoje
    try:
        resultado["cronograma_hoje"] = _get_cronograma_hoje(user_id)
    except Exception as e:
        logger.error("Erro ao computar cronograma_hoje para user %s: %s", user_id, e)
        resultado["cronograma_hoje"] = None

    # Disciplinas em risco
    try:
        resultado["disciplinas_risco"] = _get_disciplinas_risco(user_id)
    except Exception as e:
        logger.error("Erro ao computar disciplinas_risco para user %s: %s", user_id, e)
        resultado["disciplinas_risco"] = None

    # Atividade recente
    try:
        resultado["atividade_recente"] = _get_atividade_recente(user_id)
    except Exception as e:
        logger.error("Erro ao computar atividade_recente para user %s: %s", user_id, e)
        resultado["atividade_recente"] = None

    return resultado


# ──────────────────────────────────────────────
#  Progresso geral
# ──────────────────────────────────────────────

def _get_progresso_geral(user_id: str) -> dict:
    """Agrega progresso de TODOS os documentos do usuário.

    Retorna:
        total_documentos, total_disciplinas, itens_completados,
        total_itens, taxa_conclusao, horas_estudadas
    """
    supabase = _get_supabase()

    # Busca todos os documentos do usuário
    docs_result = (
        supabase.table("documents")
        .select("id, nome_original")
        .eq("user_id", user_id)
        .execute()
    )
    documentos = docs_result.data or []
    if not documentos:
        return {
            "total_documentos": 0,
            "total_disciplinas": 0,
            "itens_completados": 0,
            "total_itens": 0,
            "taxa_conclusao": 0.0,
            "horas_estudadas": 0.0,
        }

    doc_ids = [d["id"] for d in documentos]

    # Busca todo o progresso para esses documentos
    progress_result = (
        supabase.table("student_progress")
        .select("*")
        .eq("user_id", user_id)
        .in_("document_id", doc_ids)
        .execute()
    )
    progressos = progress_result.data or []

    total_itens = len(progressos)
    itens_completados = sum(1 for p in progressos if p.get("completed"))
    total_horas = sum(p.get("horas_estudadas", 0) or 0 for p in progressos)

    # Disciplinas únicas
    disciplinas_unicas = set()
    for p in progressos:
        disc = p.get("disciplina")
        if disc:
            disciplinas_unicas.add(disc)

    return {
        "total_documentos": len(documentos),
        "total_disciplinas": len(disciplinas_unicas),
        "itens_completados": itens_completados,
        "total_itens": total_itens,
        "taxa_conclusao": round(
            itens_completados / total_itens * 100, 1
        ) if total_itens > 0 else 0.0,
        "horas_estudadas": round(total_horas, 1),
    }


# ──────────────────────────────────────────────
#  Streak de estudo
# ──────────────────────────────────────────────

def _get_streak(user_id: str) -> dict:
    """Calcula streak de dias consecutivos de estudo.

    Fontes:
        - student_progress.completed_at (data de conclusão de itens)
        - flashcard_reviews.reviewed_at (data de revisão de flashcards)

    Retorna:
        dias_consecutivos, ultimo_dia, maximo_historico
    """
    supabase = _get_supabase()

    # Busca datas de student_progress (últimos 365 dias)
    progress_dates = set()
    um_ano_atras = (datetime.utcnow() - timedelta(days=365)).isoformat()
    try:
        p_result = (
            supabase.table("student_progress")
            .select("completed_at")
            .eq("user_id", user_id)
            .not_.is_("completed_at", "null")
            .gte("completed_at", um_ano_atras)
            .execute()
        )
        for row in p_result.data or []:
            dt = row.get("completed_at")
            if dt:
                try:
                    d = datetime.fromisoformat(dt.replace("Z", "+00:00")).date()
                    progress_dates.add(d)
                except (ValueError, TypeError):
                    pass
    except Exception as e:
        logger.warning("Erro ao buscar completed_at para streak: %s", e)

    # Busca datas de flashcard_reviews (últimos 365 dias)
    review_dates = set()
    try:
        r_result = (
            supabase.table("flashcard_reviews")
            .select("reviewed_at")
            .eq("user_id", user_id)
            .gte("reviewed_at", um_ano_atras)
            .execute()
        )
        for row in r_result.data or []:
            dt = row.get("reviewed_at")
            if dt:
                try:
                    d = datetime.fromisoformat(dt.replace("Z", "+00:00")).date()
                    review_dates.add(d)
                except (ValueError, TypeError):
                    pass
    except Exception as e:
        logger.warning("Erro ao buscar reviewed_at para streak: %s", e)

    study_dates = sorted(progress_dates | review_dates, reverse=True)
    if not study_dates:
        return {
            "dias_consecutivos": 0,
            "ultimo_dia": None,
            "maximo_historico": 0,
        }

    hoje = date.today()
    ultimo_dia = study_dates[0]

    # Se o último estudo foi há mais de 2 dias, streak = 0
    # Tolerância de 1 gap (ex: não estudou sábado mas estudou dom/seg)
    if (hoje - ultimo_dia).days > 2:
        # Streak quebrou — mais de 2 dias sem estudar
        streak_atual = 0
    else:
        # Calcula streak a partir de hoje (ou ontem)
        expected = hoje
        # Se hoje ainda não tem atividade, começa de ontem
        if hoje not in study_dates:
            expected = hoje - timedelta(days=1)

        streak_atual = 0
        for d in study_dates:
            if d == expected:
                streak_atual += 1
                expected -= timedelta(days=1)
            elif d == expected - timedelta(days=1):
                # Gap de 1 dia tolerado (ex: não estudou sábado, estudou dom/seg)
                streak_atual += 1
                expected = d - timedelta(days=1)
            else:
                break

    # Calcula máximo histórico (maior streak nos últimos 365 dias)
    max_streak = 0
    current = 0
    prev_date = None
    for d in reversed(study_dates):  # ordem crescente
        if prev_date is None:
            current = 1
        else:
            diff = (d - prev_date).days
            if diff <= 2:  # tolerância de 1 gap
                current += 1
            else:
                current = 1
        max_streak = max(max_streak, current)
        prev_date = d

    return {
        "dias_consecutivos": streak_atual,
        "ultimo_dia": ultimo_dia.isoformat() if ultimo_dia else None,
        "maximo_historico": max_streak,
    }


# ──────────────────────────────────────────────
#  Flashcards stats
# ──────────────────────────────────────────────

def _get_flashcards_stats(user_id: str) -> dict:
    """Coleta métricas de flashcards para o dashboard.

    Retorna:
        pendentes, revisados_hoje, total_cards, taxa_acerto
    """
    supabase = _get_supabase()

    # Total de cards
    total_result = (
        supabase.table("flashcards")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    total_cards = total_result.count if hasattr(total_result, 'count') else len(total_result.data or [])

    # Cards pendentes (next_review <= now)
    agora = datetime.utcnow().isoformat()
    due_result = (
        supabase.table("flashcards")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .lte("next_review", agora)
        .execute()
    )
    pendentes = due_result.count if hasattr(due_result, 'count') else len(due_result.data or [])

    # Revisões de hoje
    hoje_inicio = date.today().isoformat()
    hoje_result = (
        supabase.table("flashcard_reviews")
        .select("quality")
        .eq("user_id", user_id)
        .gte("reviewed_at", hoje_inicio)
        .execute()
    )
    revisoes_hoje = hoje_result.data or []
    revisados_hoje = len(revisoes_hoje)

    # Busca dados de taxa de acerto geral (últimos 90 dias)
    noventa_dias_atras = (datetime.utcnow() - timedelta(days=90)).isoformat()
    recent_result = (
        supabase.table("flashcard_reviews")
        .select("quality")
        .eq("user_id", user_id)
        .gte("reviewed_at", noventa_dias_atras)
        .execute()
    )
    reviews_recentes = recent_result.data or []
    total_reviews = len(reviews_recentes)
    acertos_total = sum(1 for r in reviews_recentes if r.get("quality", 0) >= 3)

    return {
        "pendentes": pendentes,
        "revisados_hoje": revisados_hoje,
        "total_cards": total_cards,
        "taxa_acerto": round(
            acertos_total / total_reviews * 100, 1
        ) if total_reviews > 0 else 0.0,
    }


# ──────────────────────────────────────────────
#  Urgência
# ──────────────────────────────────────────────

def _get_urgencia(user_id: str) -> dict:
    """Identifica itens urgentes para o usuário.

    Considera:
    - Cards com next_review < now() (atrasados)
    - Próximos prazos de prova no metadata dos documentos

    Retorna:
        ativo, cards_atrasados, proximo_prazo (evento, data, dias_restantes)
    """
    supabase = _get_supabase()

    # Cards atrasados (next_review < now())
    agora = datetime.utcnow().isoformat()
    atrasados_result = (
        supabase.table("flashcards")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .lt("next_review", agora)
        .execute()
    )
    cards_atrasados = atrasados_result.count if hasattr(atrasados_result, 'count') else len(atrasados_result.data or [])

    # Próximos prazos de prova (do metadata dos documentos do tipo edital)
    docs_result = (
        supabase.table("documents")
        .select("id, metadata")
        .eq("user_id", user_id)
        .eq("tipo", "edital")
        .execute()
    )
    documentos = docs_result.data or []

    proximo_prazo = None
    hoje = date.today()

    for doc in documentos:
        metadata = doc.get("metadata") or {}
        parsed = metadata.get("parsed") or {}
        datas_importantes = parsed.get("datas_importantes") or []
        for item in datas_importantes:
            data_str = item.get("data")
            evento = item.get("evento", "Evento")
            if not data_str:
                continue
            try:
                data_evento = datetime.fromisoformat(data_str.replace("Z", "+00:00")).date()
            except (ValueError, TypeError):
                continue

            if data_evento >= hoje:
                dias_restantes = (data_evento - hoje).days
                if proximo_prazo is None or dias_restantes < proximo_prazo["dias_restantes"]:
                    proximo_prazo = {
                        "evento": evento,
                        "data": data_evento.isoformat(),
                        "dias_restantes": dias_restantes,
                    }
            elif 0 <= (hoje - data_evento).days <= 7:
                # Evento que já passou há no máximo 7 dias (relevante)
                pass

    urgencia_ativa = cards_atrasados > 0 or proximo_prazo is not None

    return {
        "ativo": urgencia_ativa,
        "cards_atrasados": cards_atrasados,
        "proximo_prazo": proximo_prazo,
    }


# ──────────────────────────────────────────────
#  Progresso por concurso
# ──────────────────────────────────────────────

def _get_por_concurso(user_id: str) -> list:
    """Agrupa progresso por documento/concurso.

    Para cada documento do tipo 'edital', retorna:
        documento_id, nome, tipo, progresso (%), total_horas, total_disciplinas
    """
    supabase = _get_supabase()

    # Busca documentos do tipo edital (que têm progresso)
    docs_result = (
        supabase.table("documents")
        .select("id, nome_original, tipo, metadata")
        .eq("user_id", user_id)
        .in_("tipo", ["edital", "pdf_generico"])
        .execute()
    )
    documentos = docs_result.data or []
    if not documentos:
        return []

    doc_ids = [d["id"] for d in documentos]

    # Busca progresso agregado por documento
    progress_result = (
        supabase.table("student_progress")
        .select("document_id, completed, horas_estudadas, disciplina")
        .eq("user_id", user_id)
        .in_("document_id", doc_ids)
        .execute()
    )
    progressos = progress_result.data or []

    # Agrupa por documento
    progress_por_doc: dict[str, dict] = {}
    for p in progressos:
        doc_id = p["document_id"]
        if doc_id not in progress_por_doc:
            progress_por_doc[doc_id] = {
                "total_itens": 0,
                "completados": 0,
                "total_horas": 0.0,
                "disciplinas": set(),
            }
        progress_por_doc[doc_id]["total_itens"] += 1
        if p.get("completed"):
            progress_por_doc[doc_id]["completados"] += 1
        progress_por_doc[doc_id]["total_horas"] += p.get("horas_estudadas", 0) or 0
        if p.get("disciplina"):
            progress_por_doc[doc_id]["disciplinas"].add(p["disciplina"])

    resultado = []
    for doc in documentos:
        doc_id = doc["id"]
        stats = progress_por_doc.get(doc_id)
        if stats:
            total = stats["total_itens"]
            completados = stats["completados"]
            nome = doc.get("nome_original", "Documento")
            # Tenta extrair nome do concurso do metadata
            metadata = doc.get("metadata") or {}
            parsed = metadata.get("parsed") or {}
            if parsed.get("orgao") or parsed.get("cargo"):
                partes = filter(None, [parsed.get("orgao"), parsed.get("cargo")])
                nome_concurso = " - ".join(partes)
                nome = f"{nome_concurso} ({nome})"

            resultado.append({
                "documento_id": doc_id,
                "nome": nome,
                "tipo": doc.get("tipo", "pdf_generico"),
                "progresso": round(
                    completados / total * 100, 1
                ) if total > 0 else 0.0,
                "total_horas": round(stats["total_horas"], 1),
                "total_disciplinas": len(stats["disciplinas"]),
            })
        else:
            # Documento sem progresso ainda
            nome = doc.get("nome_original", "Documento")
            resultado.append({
                "documento_id": doc_id,
                "nome": nome,
                "tipo": doc.get("tipo", "pdf_generico"),
                "progresso": 0.0,
                "total_horas": 0.0,
                "total_disciplinas": 0,
            })

    # Ordena por progresso decrescente
    resultado.sort(key=lambda x: x["progresso"], reverse=True)
    return resultado


# ──────────────────────────────────────────────
#  Edital ativo
# ──────────────────────────────────────────────

def _get_edital_ativo(user_id: str) -> dict | None:
    """Retorna o edital mais recente do usuário com dados consolidados.

    Busca o documento do tipo 'edital' mais recente e agrega:
    - Dados básicos (nome, orgao, banca, cargo)
    - Data da prova (prioriza a definida pelo usuário no cronograma_config)
    - Progresso geral e disciplinas
    """
    supabase = _get_supabase()

    docs_result = (
        supabase.table("documents")
        .select("id, nome_original, metadata")
        .eq("user_id", user_id)
        .eq("tipo", "edital")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not docs_result.data:
        return None

    doc = docs_result.data[0]
    metadata = doc.get("metadata") or {}
    parsed = metadata.get("parsed") or {}
    doc_id = doc["id"]
    nome = doc.get("nome_original", "Edital")

    # Nome do concurso
    if parsed.get("orgao") or parsed.get("cargo"):
        partes = [p for p in [parsed.get("orgao"), parsed.get("cargo")] if p]
        nome_concurso = " - ".join(partes)
        nome = nome_concurso

    hoje = date.today()

    # --- Data da prova: prioriza a última data com blocos no cronograma ---
    # O cronograma é construído até o último dia de estudo antes da prova;
    # a última data com blocos é a melhor proxy para a data_prova definida
    # pelo usuário durante o setup, já que `cronograma_config` não persiste
    # o campo `data_prova` (ausente na migration 014).
    data_prova = None
    blocos_data = (
        supabase.table("cronograma_blocos")
        .select("data")
        .eq("user_id", user_id)
        .eq("edital_id", doc_id)
        .order("data", desc=True)
        .limit(1)
        .execute()
    )
    if blocos_data.data:
        ultima_data = blocos_data.data[0].get("data")
        if ultima_data:
            try:
                data_prova = datetime.fromisoformat(str(ultima_data).replace("Z", "+00:00")).date()
                # A última data de blocos pode ser o último dia de estudo;
                # estimamos a prova como até +7 dias (semana de revisão)
                config_result = (
                    supabase.table("cronograma_config")
                    .select("reservar_revisao")
                    .eq("user_id", user_id)
                    .eq("edital_id", doc_id)
                    .limit(1)
                    .execute()
                )
                if config_result.data and config_result.data[0].get("reservar_revisao") is True:
                    data_prova += timedelta(days=7)
            except (ValueError, TypeError):
                data_prova = None

    # Fallback: datas_importantes do parser
    if data_prova is None:
        datas_importantes = parsed.get("datas_importantes") or []
        for item in datas_importantes:
            data_str = item.get("data")
            if not data_str:
                continue
            try:
                d = datetime.fromisoformat(data_str.replace("Z", "+00:00")).date()
                if d >= hoje:
                    if data_prova is None or d < data_prova:
                        data_prova = d
            except (ValueError, TypeError):
                continue

    if data_prova:
        dias_restantes = (data_prova - hoje).days

    # Disciplinas do edital
    disciplinas = parsed.get("disciplinas") or []
    total_disciplinas = len(disciplinas)

    # Progresso geral deste documento
    progress_result = (
        supabase.table("student_progress")
        .select("completed, disciplina")
        .eq("user_id", user_id)
        .eq("document_id", doc_id)
        .execute()
    )
    progressos = progress_result.data or []
    total_itens = len(progressos)
    completados = sum(1 for p in progressos if p.get("completed"))
    progresso_geral = round(completados / total_itens * 100, 1) if total_itens > 0 else 0.0

    disciplinas_concluidas = set()
    disciplinas_total = set()
    for p in progressos:
        if p.get("disciplina"):
            disciplinas_total.add(p["disciplina"])
            if p.get("completed"):
                disciplinas_concluidas.add(p["disciplina"])

    return {
        "documento_id": doc_id,
        "nome": nome,
        "orgao": parsed.get("orgao", ""),
        "banca": parsed.get("banca", ""),
        "cargo": parsed.get("cargo", ""),
        "data_prova": data_prova.isoformat() if data_prova else None,
        "dias_restantes": dias_restantes,
        "progresso_geral": progresso_geral,
        "total_disciplinas": total_disciplinas or len(disciplinas_total),
        "disciplinas_concluidas": len(disciplinas_concluidas),
    }


# ──────────────────────────────────────────────
#  Cronograma de hoje
# ──────────────────────────────────────────────

def _get_cronograma_hoje(user_id: str) -> dict | None:
    """Retorna o cronograma do dia para exibir no dashboard.

    Tenta primeiro a tabela `cronograma_blocos` (cronograma por tópico).
    Se não houver blocos para hoje, verifica se existe um cronograma ativo
    e se hoje é dia de estudo segundo a config do usuário.
    Fallback para a lógica antiga baseada em progresso.
    """
    supabase = _get_supabase()
    hoje = date.today()

    dias_semana = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira",
                   "Sexta-feira", "Sábado", "Domingo"]
    dia_semana = dias_semana[hoje.weekday()]
    data_formatada = f"{dia_semana}, {hoje.day} de {hoje.strftime('%B')}"

    # --- 1. Busca blocos de hoje na tabela cronograma_blocos ---
    blocos_result = (
        supabase.table("cronograma_blocos")
        .select("disciplina, topico, duracao_min, status, edital_id")
        .eq("user_id", user_id)
        .eq("data", hoje.isoformat())
        .order("ordem_no_dia")
        .execute()
    )

    if blocos_result.data:
        resultado = []
        for row in blocos_result.data:
            status = row.get("status", "pendente")
            if status == "concluido":
                dot_color = "#059669"
            elif status == "pulado":
                dot_color = "#F59E0B"
            else:
                dot_color = "#0D9488"

            resultado.append({
                "disciplina": row["disciplina"],
                "topico": row["topico"],
                "horas_sugeridas": round(row["duracao_min"] / 60, 1),
                "progresso_pct": 100.0 if status == "concluido" else 0.0,
                "status": status,
                "dot_color": dot_color,
                "document_id": row.get("edital_id"),
            })

        return {
            "dia": data_formatada,
            "items": resultado,
        }

    # --- 2. Sem blocos para hoje: verifica se existe cronograma ativo ---
    config_result = (
        supabase.table("cronograma_config")
        .select("dias_da_semana")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if config_result.data:
        dias_config = config_result.data[0].get("dias_da_semana", [])
        dia_atual_num = hoje.weekday() + 1  # 1=Seg, 7=Dom

        if dias_config and dia_atual_num not in dias_config:
            # Hoje não é dia de estudo — retorna info em vez de None
            nomes_dias = {
                1: "segunda", 2: "terça", 3: "quarta", 4: "quinta",
                5: "sexta", 6: "sábado", 7: "domingo",
            }
            dias_str = ", ".join(nomes_dias.get(d, "") for d in sorted(dias_config))
            return {
                "dia": data_formatada,
                "items": [],
                "mensagem": f"Hoje não é dia de estudo (dias configurados: {dias_str})",
            }

        # Se é dia de estudo mas não há blocos, pode ser que já foram todos concluídos
        # ou o cronograma terminou. Retorna items vazio com mensagem.
        return {
            "dia": data_formatada,
            "items": [],
            "mensagem": "Nenhum bloco pendente para hoje",
        }

    # --- 3. Fallback: lógica antiga baseada em progresso ---
    docs_result = (
        supabase.table("documents")
        .select("id, nome_original, metadata")
        .eq("user_id", user_id)
        .in_("tipo", ["edital", "pdf_generico"])
        .execute()
    )
    documentos = docs_result.data or []
    if not documentos:
        return None

    banca_por_doc = {}
    disciplinas_por_doc = {}
    for doc in documentos:
        doc_id = doc["id"]
        metadata = doc.get("metadata") or {}
        parsed = metadata.get("parsed") or {}
        banca_por_doc[doc_id] = parsed.get("banca", "")
        peso_map = {}
        for disc in (parsed.get("disciplinas") or []):
            peso_map[disc.get("nome", "").lower()] = disc.get("peso", 1)
        disciplinas_por_doc[doc_id] = peso_map

    doc_ids = [d["id"] for d in documentos]

    progress_result = (
        supabase.table("student_progress")
        .select("document_id, disciplina, completed, horas_estudadas")
        .eq("user_id", user_id)
        .in_("document_id", doc_ids)
        .execute()
    )
    progressos = progress_result.data or []

    disc_map: dict[str, dict] = {}
    for p in progressos:
        doc_id = p["document_id"]
        disc_nome = p.get("disciplina", "")
        if not disc_nome:
            continue
        key = f"{doc_id}::{disc_nome}"
        if key not in disc_map:
            disc_map[key] = {
                "disciplina": disc_nome,
                "document_id": doc_id,
                "total_itens": 0,
                "completados": 0,
                "horas": 0.0,
                "peso": 1,
            }
        disc_map[key]["total_itens"] += 1
        if p.get("completed"):
            disc_map[key]["completados"] += 1
        disc_map[key]["horas"] += p.get("horas_estudadas", 0) or 0

    for key, data in disc_map.items():
        doc_id = data["document_id"]
        peso_map = disciplinas_por_doc.get(doc_id, {})
        data["peso"] = peso_map.get(data["disciplina"].lower(), 1)

    items = list(disc_map.values())
    if not items:
        return None

    items.sort(key=lambda x: (
        x["completados"] / x["total_itens"] if x["total_itens"] > 0 else 0
    ))

    resultado = []
    for item in items[:5]:
        total = item["total_itens"]
        completados = item["completados"]
        progresso_pct = round(completados / total * 100, 1) if total > 0 else 0.0

        if progresso_pct >= 80:
            status = "em_dia"
            dot_color = "#059669"
        elif progresso_pct >= 40:
            status = "atrasado"
            dot_color = "#F59E0B"
        elif progresso_pct > 0:
            status = "critico"
            dot_color = "#EF4444"
        else:
            status = "a_iniciar"
            dot_color = "#CBD5E1"

        horas_sugeridas = max(1, round(item["peso"] * 2 / 10))
        banca = banca_por_doc.get(item["document_id"], "")

        resultado.append({
            "disciplina": item["disciplina"],
            "horas_sugeridas": horas_sugeridas,
            "progresso_pct": progresso_pct,
            "status": status,
            "dot_color": dot_color,
            "banca": banca,
            "document_id": item["document_id"],
        })

    return {
        "dia": data_formatada,
        "items": resultado,
    }


# ──────────────────────────────────────────────
#  Disciplinas em risco
# ──────────────────────────────────────────────

def _get_disciplinas_risco(user_id: str) -> list:
    """Identifica disciplinas que precisam de atenção.

    Critérios:
    - Disciplinas com progresso < 30% mas peso alto (> 10%)
    - Disciplinas sem estudo nos últimos 7 dias
    - Disciplinas com muitas horas alocadas mas pouco progresso

    Retorna máximo 3 itens ordenados por criticidade.
    """
    supabase = _get_supabase()

    # Busca documentos do tipo edital
    docs_result = (
        supabase.table("documents")
        .select("id, metadata")
        .eq("user_id", user_id)
        .eq("tipo", "edital")
        .execute()
    )
    documentos = docs_result.data or []
    if not documentos:
        return []

    # Coleta todas as disciplinas dos editais com seus pesos
    todas_disciplinas = {}
    doc_ids = []
    for doc in documentos:
        doc_id = doc["id"]
        doc_ids.append(doc_id)
        metadata = doc.get("metadata") or {}
        parsed = metadata.get("parsed") or {}
        for disc in (parsed.get("disciplinas") or []):
            nome = disc.get("nome", "")
            if nome:
                todas_disciplinas[f"{doc_id}::{nome}"] = {
                    "disciplina": nome,
                    "peso": disc.get("peso", 1),
                    "document_id": doc_id,
                }

    if not todas_disciplinas:
        return []

    # Busca progresso recente
    progress_result = (
        supabase.table("student_progress")
        .select("document_id, disciplina, completed, horas_estudadas, completed_at")
        .eq("user_id", user_id)
        .in_("document_id", doc_ids)
        .execute()
    )
    progressos = progress_result.data or []

    # Agrupa por disciplina
    hoje = date.today()
    progresso_map: dict[str, dict] = {}
    for p in progressos:
        doc_id = p["document_id"]
        disc_nome = p.get("disciplina", "")
        if not disc_nome:
            continue
        key = f"{doc_id}::{disc_nome}"
        if key not in progresso_map:
            progresso_map[key] = {
                "total_itens": 0,
                "completados": 0,
                "ultimo_estudo": None,
            }
        progresso_map[key]["total_itens"] += 1
        if p.get("completed"):
            progresso_map[key]["completados"] += 1
        completed_at = p.get("completed_at")
        if completed_at:
            try:
                d = datetime.fromisoformat(completed_at.replace("Z", "+00:00")).date()
                if progresso_map[key]["ultimo_estudo"] is None or d > progresso_map[key]["ultimo_estudo"]:
                    progresso_map[key]["ultimo_estudo"] = d
            except (ValueError, TypeError):
                pass

    # Calcula risco
    riscos = []
    for key, disc_info in todas_disciplinas.items():
        stats = progresso_map.get(key, {
            "total_itens": 0,
            "completados": 0,
            "ultimo_estudo": None,
        })

        total = stats["total_itens"]
        completados = stats["completados"]
        progresso = round(completados / total * 100, 1) if total > 0 else 0.0
        peso = disc_info["peso"]

        # Critério 1: peso alto (>10%) e progresso baixo (<30%)
        if peso >= 10 and progresso < 30:
            nivel = "critico"
            mensagem = f"Peso alto ({peso}%) no edital, mas apenas {progresso}% concluído."
        # Critério 2: sem estudo há mais de 7 dias
        elif stats["ultimo_estudo"]:
            dias_sem_estudo = (hoje - stats["ultimo_estudo"]).days
            if dias_sem_estudo > 7:
                nivel = "critico" if dias_sem_estudo > 14 else "atencao"
                mensagem = f"Sem estudo há {dias_sem_estudo} dias. Revisão necessária."
            else:
                continue
        else:
            # Nunca estudou
            if peso >= 5:
                nivel = "atencao"
                mensagem = f"Nunca iniciada. Peso: {peso}% do edital."
            else:
                continue

        riscos.append({
            "disciplina": disc_info["disciplina"],
            "nivel": nivel,
            "mensagem": mensagem,
            "peso_pct": peso,
            "progresso_pct": progresso,
            "dias_sem_estudo": (hoje - stats["ultimo_estudo"]).days if stats["ultimo_estudo"] else None,
        })

    # Ordena por criticidade: critico primeiro, depois mais peso
    riscos.sort(key=lambda x: (0 if x["nivel"] == "critico" else 1, -(x["peso_pct"] or 0)))

    return riscos[:3]


# ──────────────────────────────────────────────
#  Atividade recente
# ──────────────────────────────────────────────

def _get_atividade_recente(user_id: str) -> list:
    """Retorna timeline de atividades recentes do usuário.

    Fontes (últimos 30 dias, máximo 5 eventos):
    - student_progress: estudo de disciplina
    - documents: upload de novo documento
    - flashcard_reviews: revisão de flashcards

    Cada evento: tipo, descricao, data_iso, hora
    """
    supabase = _get_supabase()
    eventos = []
    trinta_dias_atras = (datetime.utcnow() - timedelta(days=30)).isoformat()
    hoje = date.today()

    # 1. Eventos de progresso (estudo)
    try:
        p_result = (
            supabase.table("student_progress")
            .select("disciplina, horas_estudadas, completed_at, document_id")
            .eq("user_id", user_id)
            .not_.is_("completed_at", "null")
            .gte("completed_at", trinta_dias_atras)
            .order("completed_at", desc=True)
            .limit(5)
            .execute()
        )
        for row in p_result.data or []:
            dt = row.get("completed_at")
            if not dt:
                continue
            try:
                d = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                continue
            horas = row.get("horas_estudadas", 0) or 0
            disciplina = row.get("disciplina", "estudo")
            eventos.append({
                "tipo": "estudo",
                "descricao": f"Estudou {disciplina}" + (f" por {horas}h" if horas > 0 else ""),
                "data_iso": d.isoformat(),
                "data_relativa": _formatar_data_relativa(d, hoje),
            })
    except Exception as e:
        logger.warning("Erro ao buscar eventos de progresso: %s", e)

    # 2. Eventos de upload
    try:
        d_result = (
            supabase.table("documents")
            .select("nome_original, tipo, metadata, created_at")
            .eq("user_id", user_id)
            .gte("created_at", trinta_dias_atras)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        for row in d_result.data or []:
            dt = row.get("created_at")
            if not dt:
                continue
            try:
                d = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                continue
            nome = row.get("nome_original", "documento")
            parsed = (row.get("metadata") or {}).get("parsed") or {}
            orgao = parsed.get("orgao", "")
            cargo = parsed.get("cargo", "")
            if orgao or cargo:
                desc = f"Subiu edital {orgao}" + (f" - {cargo}" if cargo else "")
            else:
                desc = f"Subiu {nome}"
            eventos.append({
                "tipo": "upload",
                "descricao": desc,
                "data_iso": d.isoformat(),
                "data_relativa": _formatar_data_relativa(d, hoje),
            })
    except Exception as e:
        logger.warning("Erro ao buscar eventos de upload: %s", e)

    # 3. Eventos de revisão (flashcards)
    try:
        r_result = (
            supabase.table("flashcard_reviews")
            .select("reviewed_at")
            .eq("user_id", user_id)
            .gte("reviewed_at", trinta_dias_atras)
            .order("reviewed_at", desc=True)
            .limit(10)
            .execute()
        )
        # Agrupa revisões por dia
        revisoes_por_dia: dict[str, int] = {}
        for row in r_result.data or []:
            dt = row.get("reviewed_at")
            if not dt:
                continue
            try:
                d = datetime.fromisoformat(dt.replace("Z", "+00:00"))
                chave = d.strftime("%Y-%m-%d")
                revisoes_por_dia[chave] = revisoes_por_dia.get(chave, 0) + 1
            except (ValueError, TypeError):
                continue

        for chave, count in sorted(revisoes_por_dia.items(), reverse=True)[:3]:
            d = datetime.strptime(chave, "%Y-%m-%d")
            eventos.append({
                "tipo": "revisao",
                "descricao": f"Revisou {count} flashcard{'s' if count > 1 else ''}",
                "data_iso": d.isoformat(),
                "data_relativa": _formatar_data_relativa(d, hoje),
            })
    except Exception as e:
        logger.warning("Erro ao buscar eventos de revisão: %s", e)

    # Ordena por data decrescente e limita a 5
    eventos.sort(key=lambda x: x["data_iso"], reverse=True)
    return eventos[:5]


def _formatar_data_relativa(d: datetime, hoje: date) -> str:
    """Formata data no formato: 'Hoje 09:14', 'Ontem 18:30', '22 jun'."""
    if d.date() == hoje:
        return f"Hoje {d.strftime('%H:%M')}"
    ontem = hoje - timedelta(days=1)
    if d.date() == ontem:
        return f"Ontem {d.strftime('%H:%M')}"
    return d.strftime("%d %b")
