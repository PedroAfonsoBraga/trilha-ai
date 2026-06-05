from datetime import date, datetime, timedelta

from ics import Calendar, Event


def criar_calendario_ics(cronograma: list[dict], titulo: str = "Cronograma de Estudos") -> bytes:
    cal = Calendar()
    cal.creator = "Trilha — Cronograma de Estudos"

    for item in cronograma:
        ev = Event()
        ev.name = f"{item['disciplina']} ({item['horas']}h)"
        ev.description = (
            f"Disciplina: {item['disciplina']}\n"
            f"Horas de estudo: {item['horas']}h\n"
            f"Semana {item['semana']}\n"
        )
        ev.location = "Estudo em casa"

        periodo = item["periodo"]
        if " a " in periodo:
            parts = periodo.split(" a ")
            try:
                begin = datetime.strptime(parts[0].strip(), "%Y-%m-%d")
                end = datetime.strptime(parts[1].strip(), "%Y-%m-%d")
                ev.begin = begin.replace(hour=8)
                ev.end = begin.replace(hour=8 + min(item["horas"], 8))
                ev.duration = timedelta(hours=item["horas"])
            except ValueError:
                ev.begin = datetime.now()
                ev.duration = timedelta(hours=1)

        cal.events.add(ev)

    return cal.serialize().encode("utf-8")
