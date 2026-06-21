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


def gerar_cronograma_ajustado(
    disciplinas: list[dict],
    data_inicio: str,
    data_prova: str,
    horas_semana: int = 20,
    progress: Optional[list[dict]] = None,
) -> list[dict]:
    if not disciplinas:
        disciplinas = [{"nome": d, "peso": 1} for d in DISCIPLINAS_BASE]

    inicio = date.fromisoformat(data_inicio)
    prova = date.fromisoformat(data_prova)
    hoje = date.today()
    semanas_totais = max(1, (prova - inicio).days // 7)

    peso_total = sum(d.get("peso", 1) for d in disciplinas)

    completed_by_week = {}
    if progress:
        for p in progress:
            if p.get("completed"):
                w = p.get("semana", 0)
                disc = p.get("disciplina", "")
                if w not in completed_by_week:
                    completed_by_week[w] = set()
                completed_by_week[w].add(disc)

    cronograma = []

    for semana in range(semanas_totais):
        semana_num = semana + 1
        completed_disciplinas_this_week = completed_by_week.get(semana_num, set())

        inicio_semana = inicio + timedelta(weeks=semana)
        fim_semana = inicio_semana + timedelta(days=6)

        if inicio_semana < hoje:
            remaining = [
                d for d in disciplinas
                if d.get("nome") not in completed_disciplinas_this_week
            ]
            if not remaining:
                for disciplina in disciplinas:
                    cronograma.append({
                        "semana": semana_num,
                        "periodo": f"{inicio_semana.isoformat()} a {fim_semana.isoformat()}",
                        "disciplina": disciplina["nome"],
                        "horas": 0,
                        "peso": disciplina.get("peso", 1),
                        "num_questoes": disciplina.get("num_questoes"),
                        "completed": True,
                    })
                continue
            disciplinas_semana = remaining
        else:
            disciplinas_semana = sorted(disciplinas, key=lambda d: d.get("peso", 1), reverse=True)

        horas_disponiveis = horas_semana

        for disciplina in disciplinas_semana:
            peso = disciplina.get("peso", 1)
            horas = max(1, round(horas_semana * peso / peso_total))

            if horas_disponiveis <= 0:
                break

            horas = min(horas, horas_disponiveis)
            horas_disponiveis -= horas

            is_completed = disciplina["nome"] in completed_disciplinas_this_week

            cronograma.append({
                "semana": semana_num,
                "periodo": f"{inicio_semana.isoformat()} a {fim_semana.isoformat()}",
                "disciplina": disciplina["nome"],
                "horas": horas,
                "peso": disciplina.get("peso", 1),
                "num_questoes": disciplina.get("num_questoes"),
                "completed": is_completed,
            })

    return cronograma


def gerar_cronograma_urgencia(
    disciplinas: list[dict],
    data_prova: str,
    horas_por_dia: int = 8,
) -> list[dict]:
    if not disciplinas:
        disciplinas = [{"nome": d, "peso": 1} for d in DISCIPLINAS_BASE]

    hoje = date.today()
    prova = date.fromisoformat(data_prova)
    dias_disponiveis = max(1, (prova - hoje).days)

    peso_total = sum(d.get("peso", 1) for d in disciplinas)

    disciplinas_ordenadas = sorted(disciplinas, key=lambda d: d.get("peso", 1), reverse=True)

    cronograma = []
    dia_atual = hoje

    for dia_offset in range(dias_disponiveis):
        horas_disponiveis = horas_por_dia
        current_date = hoje + timedelta(days=dia_offset)

        for disciplina in disciplinas_ordenadas:
            if horas_disponiveis <= 0:
                break

            peso = disciplina.get("peso", 1)
            horas = max(1, round(horas_por_dia * peso / peso_total))
            horas = min(horas, horas_disponiveis)
            horas_disponiveis -= horas

            cronograma.append({
                "semana": (dia_offset // 7) + 1,
                "dia": dia_offset + 1,
                "periodo": current_date.isoformat(),
                "disciplina": disciplina["nome"],
                "horas": horas,
                "peso": disciplina.get("peso", 1),
                "num_questoes": disciplina.get("num_questoes"),
                "modo": "urgencia",
            })

    return cronograma


def recalcular_por_atraso(
    cronograma_original: list[dict],
    progress: list[dict],
    data_prova: str,
    horas_semana: int = 20,
) -> list[dict]:
    completed_items = {p["semana"]: set() for p in progress if p.get("completed")}
    for p in progress:
        if p.get("completed"):
            w = p.get("semana", 0)
            if w not in completed_items:
                completed_items[w] = set()
            completed_items[w].add(p.get("disciplina", ""))

    semanas_passadas = max(completed_items.keys()) if completed_items else 0

    disciplinas = list({item["disciplina"] for item in cronograma_original})
    peso_map = {item["disciplina"]: item.get("peso", 1) for item in cronograma_original}
    num_questoes_map = {item["disciplina"]: item.get("num_questoes") for item in cronograma_original}

    completed_disciplinas_geral = set()
    for week_disciplinas in completed_items.values():
        completed_disciplinas_geral.update(week_disciplinas)

    hoje = date.today()
    prova = date.fromisoformat(data_prova)
    semanas_restantes = max(1, (prova - hoje).days // 7)

    peso_total = sum(peso_map.get(d, 1) for d in disciplinas)

    cronograma = []
    for semana in range(semanas_restantes):
        semana_num_total = semanas_passadas + semana + 1
        inicio_semana = hoje + timedelta(weeks=semana)
        fim_semana = inicio_semana + timedelta(days=6)

        horas_disponiveis = horas_semana + 5

        disciplinas_semana = sorted(
            disciplinas,
            key=lambda d: peso_map.get(d, 1),
            reverse=True,
        )

        for disciplina in disciplinas_semana:
            peso = peso_map.get(disciplina, 1)
            horas = max(1, round((horas_semana + 5) * peso / peso_total))

            if horas_disponiveis <= 0:
                break

            horas = min(horas, horas_disponiveis)
            horas_disponiveis -= horas

            cronograma.append({
                "semana": semana_num_total,
                "periodo": f"{inicio_semana.isoformat()} a {fim_semana.isoformat()}",
                "disciplina": disciplina,
                "horas": horas,
                "peso": peso,
                "num_questoes": num_questoes_map.get(disciplina),
                "ajustado": True,
            })

    return cronograma
