import json
import logging
import os
import re
from datetime import date, timedelta

import httpx

logger = logging.getLogger(__name__)

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEFAULT_MODEL = "deepseek-v4-flash"

BANCAS = {
    "cespe": ["cespe", "cebraspe", "cespe/unb", "cebraspe/das"],
    "fcc": ["fcc", "fundação carlos chagas"],
    "vunesp": ["vunesp", "vunesp/", "fundação vunesp"],
    "fgv": ["fgv", "fundação getúlio vargas"],
    "fumarc": ["fumarc"],
    "ibfc": ["ibfc", "instituto brasileiro de formação e capacitação"],
    "idecan": ["idecan"],
    "aocp": ["aocp", "instituto aocp"],
    "quadrix": ["quadrix"],
    "consulplan": ["consulplan"],
    "nucepe": ["nucepe"],
    "iades": ["iades"],
    "selecon": ["selecon"],
    "instituto_ms": ["instituto ms", "ms concursos"],
    "comperve": ["comperve"],
    "ibade": ["ibade"],
    "fundatec": ["fundatec"],
    "fundep": ["fundep"],
    "unicentro": ["unicentro"],
}


def detectar_banca(texto: str) -> str:
    texto_lower = texto.lower()
    for banca, patterns in BANCAS.items():
        for pattern in patterns:
            if pattern in texto_lower:
                return banca
    return "indefinida"


def extrair_datas(texto: str) -> list[dict]:
    datas = []
    seen_dates = set()

    iso_patterns = [
        (r"\d{2}/\d{2}/\d{4}", "%d/%m/%Y"),
        (r"\d{2}/\d{2}/\d{2}", "%d/%m/%y"),
        (r"\d{2}\.\d{2}\.\d{4}", "%d.%m.%Y"),
        (r"\d{4}-\d{2}-\d{2}", "%Y-%m-%d"),
    ]

    for pattern, fmt in iso_patterns:
        for match in re.finditer(pattern, texto):
            try:
                d = date.strftime(date.strptime(match.group(), fmt), "%Y-%m-%d")
                if d not in seen_dates:
                    seen_dates.add(d)
                    context_start = max(0, match.start() - 80)
                    context_end = min(len(texto), match.end() + 80)
                    context = texto[context_start:context_end].strip()
                    datas.append({"data": d, "contexto": context})
            except ValueError:
                pass

    months = {
        "janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4,
        "maio": 5, "junho": 6, "julho": 7, "agosto": 8,
        "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
    }
    short_months = {
        "jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5,
        "jun": 6, "jul": 7, "ago": 8, "set": 9, "out": 10,
        "nov": 11, "dez": 12,
    }

    date_words = (
        r"\d{1,2}\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|"
        r"julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4}"
    )
    for match in re.finditer(date_words, texto, re.IGNORECASE):
        try:
            parts = match.group().lower().split()
            day = int(parts[0])
            month_str = parts[2]
            month = months[month_str]
            year = int(parts[4])
            d = date(year, month, day).isoformat()
            if d not in seen_dates:
                seen_dates.add(d)
                context_start = max(0, match.start() - 80)
                context_end = min(len(texto), match.end() + 80)
                context = texto[context_start:context_end].strip()
                datas.append({"data": d, "contexto": context})
        except (ValueError, IndexError, KeyError):
            pass

    ordinal_pattern = (
        r"\d{1,2}[º°]\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|"
        r"julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4}"
    )
    for match in re.finditer(ordinal_pattern, texto, re.IGNORECASE):
        try:
            parts = re.sub(r"[º°]", "", match.group().lower()).split()
            day = int(parts[0])
            month_str = parts[2]
            month = months[month_str]
            year = int(parts[4])
            d = date(year, month, day).isoformat()
            if d not in seen_dates:
                seen_dates.add(d)
                context_start = max(0, match.start() - 80)
                context_end = min(len(texto), match.end() + 80)
                context = texto[context_start:context_end].strip()
                datas.append({"data": d, "contexto": context})
        except (ValueError, IndexError, KeyError):
            pass

    range_pattern = (
        r"(\d{2}/\d{2}/\d{4})\s*(?:a|até|—|–|–|—)\s*(\d{2}/\d{2}/\d{4})"
    )
    for match in re.finditer(range_pattern, texto, re.IGNORECASE):
        try:
            d_start = date.strftime(date.strptime(match.group(1), "%d/%m/%Y"), "%Y-%m-%d")
            d_end = date.strftime(date.strptime(match.group(2), "%d/%m/%Y"), "%Y-%m-%d")
            for d in [d_start, d_end]:
                if d not in seen_dates:
                    seen_dates.add(d)
                    context_start = max(0, match.start() - 80)
                    context_end = min(len(texto), match.end() + 80)
                    context = texto[context_start:context_end].strip()
                    datas.append({"data": d, "contexto": context})
        except ValueError:
            pass

    month_year_pattern = (
        r"(janeiro|fevereiro|março|abril|maio|junho|"
        r"julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4}"
    )
    for match in re.finditer(month_year_pattern, texto, re.IGNORECASE):
        try:
            parts = match.group().lower().split()
            month_str = parts[0]
            month = months[month_str]
            year = int(parts[2])
            d = date(year, month, 1).isoformat()
            if d not in seen_dates:
                seen_dates.add(d)
                context_start = max(0, match.start() - 80)
                context_end = min(len(texto), match.end() + 80)
                context = texto[context_start:context_end].strip()
                datas.append({"data": d, "contexto": context})
        except (ValueError, IndexError, KeyError):
            pass

    return datas


EDITAL_SYSTEM_PROMPT = """Você é um parser de editais de concurso público brasileiro.

Analise o texto do edital abaixo e retorne um JSON com a seguinte estrutura:
{
  "banca": "cespe|fcc|vunesp|fgv|fumarc|ibfc|idecan|aocp|quadrix|consulplan|nucepe|iades|selecon|instituto_ms|comperve|ibade|fundatec|fundep|unicentro|indefinida",
  "cargo": "nome do cargo",
  "orgao": "nome do órgão",
  "datas_importantes": [
    {"evento": "nome do evento (inscricao, prova, resultado, etc)", "data": "YYYY-MM-DD"}
  ],
  "disciplinas": [
    {"nome": "nome da disciplina", "peso": 5, "num_questoes": 10}
  ],
  "salario_inicial": "R$ X.XXX,XX (se disponível)",
  "total_vagas": 0,
  "resumo": "resumo de 2-3 frases sobre o concurso",
  "conteudo_programatico": [
    {"disciplina": "nome", "topicos": ["tópico 1", "tópico 2"]}
  ]
}

Regras:
- Se uma informação não estiver disponível, use null ou "".
- Para pesos de disciplinas, se não estiver explícito, atribua peso 2 para específicas e 1 para gerais.
- Para número de questões, se não estiver explícito, use 10 como padrão.
- Datas no formato YYYY-MM-DD.
- conteudo_programatico deve extrair os tópicos de cada disciplina quando disponíveis.

Responda APENAS com o JSON, sem markdown ou texto adicional."""


def _try_parse_json(content: str) -> dict:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```\w*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse failed at {e.pos}: {e.msg}, attempting recovery")
        truncated = content[:e.pos]
        open_braces = truncated.count("{") - truncated.count("}")
        open_brackets = truncated.count("[") - truncated.count("]")
        truncated += "}" * open_braces
        truncated += "]" * open_brackets
        try:
            return json.loads(truncated)
        except json.JSONDecodeError:
            raise ValueError(f"Não foi possível recuperar o JSON da resposta: {content[:200]}...")


async def parse_edital_ia(texto: str) -> dict:
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY não configurada")

    input_text = texto[:120000]

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(
            DEEPSEEK_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEFAULT_MODEL,
                "messages": [
                    {"role": "system", "content": EDITAL_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Texto do edital:\n\n{input_text}"},
                ],
                "max_tokens": 8192,
                "temperature": 0.3,
            },
        )
        response.raise_for_status()
        data = response.json()

    content = data["choices"][0]["message"]["content"]
    return _try_parse_json(content)


def parse_edital_regex(texto: str) -> dict:
    bancas = []
    for banca_name, patterns in BANCAS.items():
        for p in patterns:
            if p in texto.lower():
                bancas.append(banca_name)
                break

    subjects = [
        "português", "matemática", "raciocínio lógico", "informática",
        "direito constitucional", "direito administrativo", "direito penal",
        "direito civil", "direito tributário", "direito do trabalho",
        "administração", "contabilidade", "economia", "estatística",
        "atualidades", "legislação", "conhecimentos específicos",
        "conhecimentos gerais",
    ]

    texto_lower = texto.lower()
    disciplinas = []
    for subject in subjects:
        if subject in texto_lower:
            peso = 2 if "específic" in subject or "direito" in subject else 1
            disciplinas.append({
                "nome": subject.title(),
                "peso": peso,
                "num_questoes": None,
            })

    datas = extrair_datas(texto)

    return {
        "banca": bancas[0] if bancas else "indefinida",
        "disciplinas": disciplinas if disciplinas else None,
        "datas_importantes": [
            {"evento": "", "data": d["data"]} for d in datas[:20]
        ] if datas else None,
        "datas_raw": [d["data"] for d in datas[:20]],
    }


async def parse_edital(texto: str) -> dict:
    regex_result = parse_edital_regex(texto)
    banca_detectada = regex_result.get("banca", "indefinida")

    if DEEPSEEK_API_KEY:
        try:
            ia_result = await parse_edital_ia(texto)
            merged = {**regex_result, **ia_result}
            if banca_detectada != "indefinida" and ia_result.get("banca") == "indefinida":
                merged["banca"] = banca_detectada
            return merged
        except Exception as e:
            logger.warning(f"DeepSeek parse failed, falling back to regex: {e}")

    return regex_result
