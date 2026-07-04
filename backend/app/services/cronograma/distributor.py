"""
Algoritmo de distribuição de tempo de estudo por tópico.

Inputs:
  - Tópicos extraídos do edital (com peso e disciplina)
  - Configuração do usuário (dias disponíveis, horas/dia, nível por disciplina,
    reservar última semana para revisão, data da prova)

Regras:
  - Fator de nível: fraco=1.3, medio=1.0, forte=0.7
  - Tempo por disciplina baseado no peso (se disponível) ou distribuição igual
  - Tempo por tópico dentro da disciplina uniforme
  - Blocos de estudo entre 45 e 150 minutos
  - Normalização para respeitar o tempo total disponível
"""

import logging
from datetime import date, timedelta

from app.models.cronograma import Disciplina, TopicBlock, UserConfig

logger = logging.getLogger(__name__)

MIN_BLOCO_MIN = 45
MAX_BLOCO_MIN = 150

FATOR_NIVEL = {
    "fraco": 1.3,
    "medio": 1.0,
    "forte": 0.7,
}


def _dias_uteis_entre(inicio: date, fim: date, dias_da_semana: list[int]) -> list[date]:
    """Retorna datas entre inicio e fim (exclusivo fim) filtradas pelos dias da semana.

    dias_da_semana: 1=Seg, 7=Dom.
    """
    dias = []
    dia = inicio
    semana_set = set(dias_da_semana)
    while dia < fim:
        # date.weekday(): 0=Seg, 6=Dom. Converter para 1-7
        if (dia.weekday() + 1) in semana_set:
            dias.append(dia)
        dia += timedelta(days=1)
    return dias


def _calcular_tempo_disponivel(user_config: UserConfig) -> tuple[int, list[date]]:
    """Calcula minutos totais disponíveis e lista de dias de estudo."""
    hoje = date.today()
    data_prova = user_config.data_prova

    if data_prova <= hoje:
        # Edge case: prova hoje ou no passado. Retorna ao menos 1 dia.
        dias_estudo = [hoje]
        minutos = int(user_config.horas_por_dia * 60)
        return minutos, dias_estudo

    dias_totais = _dias_uteis_entre(hoje, data_prova, user_config.dias_da_semana)

    if user_config.reservar_revisao:
        # Última semana (7 dias anteriores à prova) reservada para revisão
        semana_revisao_inicio = data_prova - timedelta(days=7)
        dias_estudo = [d for d in dias_totais if d < semana_revisao_inicio]
    else:
        dias_estudo = dias_totais

    minutos_disponiveis = int(len(dias_estudo) * user_config.horas_por_dia * 60)
    return max(0, minutos_disponiveis), dias_estudo


def _calcular_tempo_por_disciplina(
    disciplinas: list[Disciplina],
    minutos_disponiveis: int,
    nivel_por_disciplina: dict[str, str],
) -> list[Disciplina]:
    """Distribui minutos entre disciplinas baseado em peso e nível."""
    total_peso = 0.0
    tem_peso = all(d.peso is not None and d.peso > 0 for d in disciplinas)

    # Se houver disciplinas com peso, normalizamos pelos pesos existentes;
    # assemelha-se a pesos serem percentuais.
    if tem_peso:
        total_peso = sum(d.peso for d in disciplinas if d.peso)
    else:
        # Distribuição igual: cada uma pesa 1
        total_peso = len(disciplinas)

    if total_peso == 0:
        total_peso = len(disciplinas) or 1

    resultado = []
    fator_soma = 0.0
    tempos_brutos = []

    for d in disciplinas:
        nivel = nivel_por_disciplina.get(d.nome, "medio")
        fator = FATOR_NIVEL.get(nivel, 1.0)

        if tem_peso and d.peso:
            proporcao = d.peso / total_peso
        else:
            proporcao = 1.0 / len(disciplinas)

        tempo_bruto = minutos_disponiveis * proporcao * fator
        tempos_brutos.append((d, tempo_bruto))
        fator_soma += proporcao * fator

    # Normalização: a soma dos tempos brutos pode exceder minutos_disponiveis
    # porque os fatores de nível são multiplicativos. Reescalonamos.
    if fator_soma == 0:
        fator_soma = 1

    for d, tempo_bruto in tempos_brutos:
        tempo_normalizado = int(tempo_bruto / fator_soma)
        d.tempo_total = max(0, tempo_normalizado)
        resultado.append(d)

    return resultado


def _distribuir_topicos_em_blocos(disciplina: Disciplina) -> list[TopicBlock]:
    """Converte os tópicos de uma disciplina em blocos respeitando 45-150min."""
    blocos: list[TopicBlock] = []
    tempo_total = disciplina.tempo_total or 0
    topicos = disciplina.topicos

    if not topicos:
        # Sem tópicos: bloco único da disciplina inteira
        if tempo_total > 0:
            blocos.append(TopicBlock(
                disciplina=disciplina.nome,
                topico=f"{disciplina.nome} — estudo geral",
                duracao_min=_clamp(tempo_total),
            ))
        return blocos

    tempo_por_topico = tempo_total / len(topicos)

    if tempo_por_topico < MIN_BLOCO_MIN:
        # Agrupa tópicos adjacentes até atingir o mínimo
        tempo_acumulado = 0
        topicos_agrupados: list[str] = []
        for t in topicos:
            tempo_acumulado += tempo_por_topico
            topicos_agrupados.append(t)
            if tempo_acumulado >= MIN_BLOCO_MIN:
                blocos.append(TopicBlock(
                    disciplina=disciplina.nome,
                    topico="; ".join(topicos_agrupados),
                    duracao_min=_clamp(int(tempo_acumulado)),
                ))
                tempo_acumulado = 0
                topicos_agrupados = []
        if topicos_agrupados:
            # Mescla no último bloco se houver, ou cria bloco pequeno sozinho
            if blocos:
                ultimo = blocos[-1]
                ultimo.topico += "; " + "; ".join(topicos_agrupados)
                ultimo.duracao_min = _clamp(ultimo.duracao_min + int(tempo_acumulado))
            else:
                blocos.append(TopicBlock(
                    disciplina=disciplina.nome,
                    topico="; ".join(topicos_agrupados),
                    duracao_min=MIN_BLOCO_MIN,
                ))
    elif tempo_por_topico > MAX_BLOCO_MIN:
        # Divide o tópico em múltiplas sessões
        for t in topicos:
            tempo_restante = tempo_por_topico
            parte = 1
            while tempo_restante > 0:
                duracao = min(MAX_BLOCO_MIN, max(MIN_BLOCO_MIN, int(tempo_restante)))
                blocos.append(TopicBlock(
                    disciplina=disciplina.nome,
                    topico=f"{t} (parte {parte})" if parte > 1 else t,
                    duracao_min=duracao,
                ))
                tempo_restante -= duracao
                parte += 1
    else:
        for t in topicos:
            blocos.append(TopicBlock(
                disciplina=disciplina.nome,
                topico=t,
                duracao_min=_clamp(int(tempo_por_topico)),
            ))

    return blocos


def _clamp(minutos: int) -> int:
    """Garante que o bloco esteja entre MIN e MAX."""
    return max(MIN_BLOCO_MIN, min(MAX_BLOCO_MIN, minutos))


def distribute_topics(
    disciplinas: list[Disciplina],
    user_config: UserConfig,
) -> dict:
    """Distribui tópicos em blocos de estudo respeitando config do usuário.

    Returns:
        {
            "minutos_disponiveis": int,
            "dias_estudo": list[date],
            "blocos": list[TopicBlock],
            "disciplinas": list[Disciplina],
            "aviso": str | None,
        }
    """
    minutos_disponiveis, dias_estudo = _calcular_tempo_disponivel(user_config)

    if not disciplinas:
        return {
            "minutos_disponiveis": minutos_disponiveis,
            "dias_estudo": dias_estudo,
            "blocos": [],
            "disciplinas": [],
            "aviso": "Nenhuma disciplina encontrada no edital.",
        }

    if minutos_disponiveis <= 0:
        return {
            "minutos_disponiveis": 0,
            "dias_estudo": dias_estudo,
            "blocos": [],
            "disciplinas": disciplinas,
            "aviso": "Tempo insuficiente até a prova para gerar cronograma.",
        }

    disciplinas_com_tempo = _calcular_tempo_por_disciplina(
        disciplinas,
        minutos_disponiveis,
        user_config.nivel_por_disciplina,
    )

    blocos: list[TopicBlock] = []
    for d in disciplinas_com_tempo:
        blocos.extend(_distribuir_topicos_em_blocos(d))

    # Ajuste final: a soma dos blocos pode não bater exatamente com minutos_disponiveis
    # por arredondamentos/clamp. Normalizamos proporcionalmente.
    soma_blocos = sum(b.duracao_min for b in blocos)
    if soma_blocos > 0 and soma_blocos != minutos_disponiveis:
        fator = minutos_disponiveis / soma_blocos
        novo_total = 0
        for b in blocos[:-1]:
            b.duracao_min = _clamp(int(b.duracao_min * fator))
            novo_total += b.duracao_min
        if blocos:
            blocos[-1].duracao_min = _clamp(minutos_disponiveis - novo_total)

    aviso = None
    total_topicos = sum(len(d.topicos) for d in disciplinas)
    if total_topicos > len(dias_estudo) * 2:
        aviso = (
            f"Você tem {total_topicos} tópicos para {len(dias_estudo)} dias úteis. "
            "Priorizamos as disciplinas de maior peso. Ajuste suas horas diárias para cobertura completa."
        )

    return {
        "minutos_disponiveis": minutos_disponiveis,
        "dias_estudo": dias_estudo,
        "blocos": blocos,
        "disciplinas": disciplinas_com_tempo,
        "aviso": aviso,
    }
