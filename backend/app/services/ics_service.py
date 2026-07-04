from datetime import datetime, timedelta

from ics import Calendar, Event


def criar_calendario_ics(cronograma: list[dict], titulo: str = "Cronograma de Estudos", plano: str = "free") -> bytes:
    cal = Calendar()
    cal.creator = "Trilha — Cronograma de Estudos"

    footer_note = "\n\n---\nGerado com Trilha — Inteligência Artificial para seus estudos"
    if plano == "free":
        footer_note += "\nPlano Gratuito"

    for item in cronograma:
        ev = Event()
        topico = item.get('topico', '')
        disciplina = item['disciplina']
        if topico:
            ev.name = f"[{disciplina}] {topico}"
        else:
            ev.name = f"{disciplina} ({item['horas']}h)"

        descricao = (
            f"Disciplina: {disciplina}\n"
            f"Horas de estudo: {item['horas']}h\n"
        )
        if topico:
            descricao += f"Tópico: {topico}\n"
        descricao += f"Semana {item['semana']}{footer_note}"
        ev.description = descricao
        ev.location = "Estudo em casa"

        periodo = item["periodo"]
        if " a " in periodo:
            parts = periodo.split(" a ")
            try:
                begin = datetime.strptime(parts[0].strip(), "%Y-%m-%d")
                end = datetime.strptime(parts[1].strip(), "%Y-%m-%d")  # noqa: F841
                ev.begin = begin.replace(hour=8)
                ev.end = begin.replace(hour=8 + min(item["horas"], 8))
                ev.duration = timedelta(hours=item["horas"])
            except ValueError:
                ev.begin = datetime.now()
                ev.duration = timedelta(hours=1)

        cal.events.add(ev)

    return cal.serialize().encode("utf-8")
