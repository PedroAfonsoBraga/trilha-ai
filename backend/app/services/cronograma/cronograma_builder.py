"""
Construção do calendário dia a dia a partir dos blocos distribuídos.

Regras:
  - Itera pelos dias disponíveis respeitando dias_da_semana.
  - Preenche até horas_por_dia * 60 minutos por dia.
  - Intercala disciplinas (não repete a mesma no mesmo dia se houver variedade).
  - Última semana (se reservar_revisao): substitui por revisão das disciplinas
    com menor percentual de conclusão.
  - Blocos pulados são reagendados para próximos dias disponíveis.
"""

import logging
from datetime import date, timedelta

from app.models.cronograma import DaySchedule, TopicBlock, UserConfig

logger = logging.getLogger(__name__)

# Constante local para bloco mínimo por dia
MIN_BLOCO_DIA = 30


def _intercalar_blocos(blocos: list[TopicBlock]) -> list[TopicBlock]:
    """Ordena blocos intercalando disciplinas para variar o dia de estudo."""
    if not blocos:
        return []

    por_disciplina: dict[str, list[TopicBlock]] = {}
    for b in blocos:
        por_disciplina.setdefault(b.disciplina, []).append(b)

    ordenado = []
    disciplinas = list(por_disciplina.keys())
    idx = 0
    while any(por_disciplina[d] for d in disciplinas):
        d = disciplinas[idx % len(disciplinas)]
        if por_disciplina[d]:
            ordenado.append(por_disciplina[d].pop(0))
        idx += 1

    return ordenado


def _calcular_revisao(
    dias_estudo: list[date],
    blocos_concluidos: list[TopicBlock],
    disciplinas: list,
) -> list[TopicBlock]:
    """Cria blocos de revisão para a última semana.

    Seleciona as disciplinas com menor taxa de conclusão e distribui
    blocos de revisão ao longo dos últimos 7 dias.
    """
    if not disciplinas:
        return []

    # Taxa de conclusão por disciplina (baseado nos blocos já concluídos)
    concluidos_por_disc = {}
    for b in blocos_concluidos:
        if b.status == "concluido":
            concluidos_por_disc[b.disciplina] = concluidos_por_disc.get(b.disciplina, 0) + 1

    total_por_disc = {}
    for b in blocos_concluidos:
        total_por_disc[b.disciplina] = total_por_disc.get(b.disciplina, 0) + 1

    disciplinas_ordenadas = sorted(
        disciplinas,
        key=lambda d: concluidos_por_disc.get(d.nome, 0) / max(1, total_por_disc.get(d.nome, 1)),
    )

    revisao = []
    for i, d in enumerate(disciplinas_ordenadas):
        revisao.append(TopicBlock(
            disciplina=d.nome,
            topico=f"Revisão geral de {d.nome}",
            duracao_min=90,
            status="pendente",
        ))
        if i >= 6:
            break
    return revisao


def build_cronograma(
    distribution: dict,
    user_config: UserConfig,
    blocos_concluidos: list[TopicBlock] | None = None,
) -> list[list[DaySchedule]]:
    """Monta o cronograma semana a semana.

    Args:
        distribution: saída de distribute_topics().
        user_config: configuração do usuário.
        blocos_concluidos: blocos já marcados como concluído em gerações anteriores.

    Returns:
        Lista de semanas, cada uma com 7 dias (pode ter dias sem blocos).
    """
    dias_estudo: list[date] = distribution["dias_estudo"]
    blocos: list[TopicBlock] = list(distribution["blocos"])
    disciplinas = distribution.get("disciplinas", [])
    blocos_concluidos = blocos_concluidos or []

    minutos_por_dia = int(user_config.horas_por_dia * 60)

    if user_config.reservar_revisao:
        # Reserva os últimos 7 dias para revisão
        semana_revisao_dias = dias_estudo[-7:] if len(dias_estudo) > 7 else []
        dias_estudo = dias_estudo[:-7] if len(dias_estudo) > 7 else dias_estudo
    else:
        semana_revisao_dias = []

    # Separa blocos concluídos previamente das disciplinas (não reagendar)
    concluidos_existentes = [b for b in blocos_concluidos if b.status == "concluido"]

    # Blocos pendentes a agendar
    blocos_pendentes = _intercalar_blocos(blocos)

    # Agendamento
    dias_agendados: list[DaySchedule] = []
    dia_atrasados: list[TopicBlock] = []  # blocos remarcados

    for dia in dias_estudo:
        minutos_restantes = minutos_por_dia
        blocos_do_dia: list[TopicBlock] = []

        # Prioridade 1: blocos atrasados (pulados em dias anteriores)
        while dia_atrasados and minutos_restantes >= MIN_BLOCO_DIA:
            b = dia_atrasados[0]
            duracao = min(b.duracao_min, minutos_restantes)
            if duracao < MIN_BLOCO_DIA:
                break
            b.duracao_min = duracao
            blocos_do_dia.append(dia_atrasados.pop(0))
            minutos_restantes -= duracao

        # Prioridade 2: blocos normais
        while blocos_pendentes and minutos_restantes >= MIN_BLOCO_DIA:
            # Evita mesma disciplina no mesmo dia se houver variedade
            proximos = [b for b in blocos_pendentes]
            if blocos_do_dia and len(proximos) > 1:
                disciplinas_no_dia = {b.disciplina for b in blocos_do_dia}
                alternativas = [b for b in proximos if b.disciplina not in disciplinas_no_dia]
                if alternativas:
                    proximos = alternativas

            b = proximos[0]
            blocos_pendentes.remove(b)

            if b.duracao_min > minutos_restantes:
                # Divide o bloco: parte hoje, parte para atrasados
                parte_hoje = minutos_restantes
                duracao_original = b.duracao_min  # salva ANTES de sobrescrever
                b.duracao_min = parte_hoje
                blocos_do_dia.append(b)
                minutos_restantes = 0

                # Restante vira novo bloco pendente
                restante = TopicBlock(
                    disciplina=b.disciplina,
                    topico=b.topico,
                    duracao_min=duracao_original - parte_hoje,
                    status="pendente",
                )
                dia_atrasados.append(restante)
            else:
                blocos_do_dia.append(b)
                minutos_restantes -= b.duracao_min

        total_minutos = sum(b.duracao_min for b in blocos_do_dia)
        dias_agendados.append(DaySchedule(
            date=dia,
            blocos=blocos_do_dia,
            total_minutos=total_minutos,
        ))

    # Revisão na última semana
    if semana_revisao_dias:
        revisao_blocos = _calcular_revisao(semana_revisao_dias, blocos_concluidos, disciplinas)
        revisao_idx = 0
        for dia in semana_revisao_dias:
            blocos_do_dia: list[TopicBlock] = []
            minutos_restantes = minutos_por_dia
            while minutos_restantes >= MIN_BLOCO_DIA and revisao_idx < len(revisao_blocos):
                b = revisao_blocos[revisao_idx]
                duracao = min(b.duracao_min, minutos_restantes)
                if duracao < MIN_BLOCO_DIA:
                    break
                blocos_do_dia.append(TopicBlock(
                    disciplina=b.disciplina,
                    topico=b.topico,
                    duracao_min=duracao,
                    status="pendente",
                ))
                minutos_restantes -= duracao
                revisao_idx += 1
            dias_agendados.append(DaySchedule(
                date=dia,
                blocos=blocos_do_dia,
                total_minutos=sum(b.duracao_min for b in blocos_do_dia),
            ))

    # Se ainda houver blocos pendentes sem dia, força distribuição nos dias com espaço
    # ou adiciona dias extras (não deixar tópico sem data)
    while blocos_pendentes:
        b = blocos_pendentes.pop(0)
        colocado = False
        for ds in dias_agendados:
            if ds.total_minutos + b.duracao_min <= minutos_por_dia:
                ds.blocos.append(b)
                ds.total_minutos += b.duracao_min
                colocado = True
                break
        if not colocado:
            # Dia extra no fim (além da prova)
            ultimo_dia = dias_agendados[-1].date if dias_agendados else date.today()
            dias_agendados.append(DaySchedule(
                date=ultimo_dia + timedelta(days=1),
                blocos=[b],
                total_minutos=b.duracao_min,
            ))

    # Agrupa em semanas (começando na data do primeiro dia)
    if not dias_agendados:
        return []

    semanas: list[list[DaySchedule]] = []
    semana_atual: list[DaySchedule] = []
    primeiro_dia = dias_agendados[0].date

    for ds in dias_agendados:
        semana_num = (ds.date - primeiro_dia).days // 7
        while len(semanas) <= semana_num:
            semanas.append([])
        semanas[semana_num].append(ds)

    return semanas
