import json
import logging
import os
import re

import httpx

logger = logging.getLogger(__name__)

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEFAULT_MODEL = "deepseek-v4-flash"

FLASHCARD_SYSTEM = """Você é um especialista em criação de flashcards educacionais para o sistema Anki (revisão espaçada).

Analise o texto abaixo e gere flashcards no formato frente/verso. Cada flashcard deve:
- Ter uma pergunta clara e objetiva na frente
- Ter uma resposta concisa e precisa no verso
- Ser autocontido (não depender de outros flashcards para fazer sentido)
- Ter tags relevantes para categorização

Retorne um array JSON com os flashcards:

[
  {
    "frente": "O que é ...?",
    "verso": "É ...",
    "tags": ["direito", "constitucional"]
  }
]

Regras:
- Gere entre 5 e 20 flashcards, dependendo da densidade do conteúdo
- Priorize conceitos-chave, definições, prazos, classificações e fórmulas
- Tags devem ser palavras-chave curtas (1-3 palavras) em português
- Se o texto for muito extenso, foque nos tópicos mais relevantes
- Evite flashcards muito longos (frente até 200 caracteres, verso até 500)

Responda APENAS com o array JSON, sem markdown ou texto adicional."""


def _try_parse_flashcards(content: str) -> list[dict]:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```\w*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)

    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON flashcard parse failed at {e.pos}: {e.msg}, attempting recovery")
        truncated = content[:e.pos]
        if truncated.rstrip().endswith('"') is False and '"' in truncated:
            truncated = truncated.rsplit('"', 1)[0] + '"\n'
        open_braces = truncated.count("{") - truncated.count("}")
        open_brackets = truncated.count("[") - truncated.count("]")
        truncated += "}" * open_braces
        truncated += "]" * open_brackets
        try:
            data = json.loads(truncated)
        except json.JSONDecodeError:
            raise ValueError(f"Não foi possível recuperar o JSON de flashcards: {content[:200]}...")

    if isinstance(data, list):
        return [fc for fc in data if isinstance(fc, dict) and "frente" in fc and "verso" in fc]
    if isinstance(data, dict) and "flashcards" in data:
        return [fc for fc in data["flashcards"] if isinstance(fc, dict) and "frente" in fc and "verso" in fc]
    raise ValueError(f"Formato inesperado de flashcards: {str(data)[:200]}")


async def gerar_flashcards_ia(texto: str, max_cards: int = 20) -> list[dict]:
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
                    {"role": "system", "content": FLASHCARD_SYSTEM},
                    {"role": "user", "content": f"Texto para criação de flashcards:\n\n{input_text}"},
                ],
                "max_tokens": 8192,
                "temperature": 0.5,
            },
        )
        response.raise_for_status()
        data = response.json()

    content = data["choices"][0]["message"]["content"]
    finish_reason = data["choices"][0].get("finish_reason", "")

    if finish_reason == "length":
        logger.warning("DeepSeek flashcard response truncated by token limit")

    flashcards = _try_parse_flashcards(content)

    if len(flashcards) > max_cards:
        logger.info(f"Truncating flashcards from {len(flashcards)} to {max_cards}")
        flashcards = flashcards[:max_cards]

    return flashcards
