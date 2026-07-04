from datetime import date, timedelta
from typing import Optional


DISCIPLINAS_BASE = [
    "Português", "Matemática", "Raciocínio Lógico", "Informática",
    "Direito Constitucional", "Direito Administrativo", "Direito Penal",
    "Conhecimentos Específicos",
]


def gerar_cronograma(
    disciplinas: list[dict],
    data_inicio: Optional[str] = None,
    data_prova: Optional[str] = None,
    horas_semana: int = 20,
) -> list[dict]:
    if not disciplinas:
        disciplinas = [{"nome": d, "peso": 1} for d in DISCIPLINAS_BASE]

    if not data_inicio:
        data_inicio = date.today().isoformat()

    if not data_prova:
        data_prova = (date.today() + timedelta(days=90)).isoformat()

    inicio = date.fromisoformat(data_inicio)
    prova = date.fromisoformat(data_prova)
    semanas_totais = max(1, (prova - inicio).days // 7)

    peso_total = sum(d.get("peso", 1) for d in disciplinas)

    cronograma = []
    dia_atual = inicio

    for semana in range(semanas_totais):
        disciplinas_semana = sorted(disciplinas, key=lambda d: d.get("peso", 1), reverse=True)
        horas_disponiveis = horas_semana

        for disciplina in disciplinas_semana:
            peso = disciplina.get("peso", 1)
            horas = max(1, round(horas_semana * peso / peso_total))

            if horas_disponiveis <= 0:
                break

            horas = min(horas, horas_disponiveis)
            horas_disponiveis -= horas

            inicio_semana = dia_atual + timedelta(weeks=semana)
            fim_semana = inicio_semana + timedelta(days=6)

            cronograma.append({
                "semana": semana + 1,
                "periodo": f"{inicio_semana.isoformat()} a {fim_semana.isoformat()}",
                "disciplina": disciplina["nome"],
                "horas": horas,
                "peso": disciplina.get("peso", 1),
                "num_questoes": disciplina.get("num_questoes"),
            })

    return cronograma


# As funções abaixo foram removidas pois pertenciam à solução legada
# de cronograma do Concurso Assistant (removida em Sprint 15):
#   - gerar_cronograma_ajustado()
#   - gerar_cronograma_urgencia()
#   - recalcular_por_atraso()
# A função gerar_cronograma() é mantida como fallback para editais
# sem tópicos extraídos no novo cronograma por tópicos (cronograma.py).
