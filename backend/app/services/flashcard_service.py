import json
import logging
import re
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

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


async def gerar_flashcards_ia(texto: str, max_cards: int = 20, user_id: Optional[str] = None) -> list[dict]:
    from app.services.llm_client import generate_text

    input_text = texto[:120000]

    content = await generate_text(
        system_prompt=FLASHCARD_SYSTEM,
        user_text=f"Texto para criação de flashcards:\n\n{input_text}",
        feature="flashcard",
        max_tokens=8192,
        temperature=0.5,
        user_id=user_id,
    )

    flashcards = _try_parse_flashcards(content)

    if len(flashcards) > max_cards:
        logger.info(f"Truncating flashcards from {len(flashcards)} to {max_cards}")
        flashcards = flashcards[:max_cards]

    return flashcards
