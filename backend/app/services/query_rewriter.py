"""Query rewriting para RAG do chat.

Transforma perguntas coloquiais do concurseiro (ex: "cai matemática nesse edital?")
em variantes formais otimizadas para busca semântica + lexical. Também extrai
keywords para boost na busca FTS.

O serviço é tolerante a falhas: se o LLM não responder JSON válido, retorna
a query original como única variante.
"""

import json
import logging
from typing import Dict, List, Optional

from app.services.cache_service import get_cached
from app.services.llm_client import generate_text, DEFAULT_MODEL

logger = logging.getLogger(__name__)


_REWRITE_SYSTEM_PROMPT = """Você é um assistente de busca para concurseiros brasileiros.
Dada a pergunta do usuário sobre editais e documentos de concurso público, reescreva-a em 1 a 3 variantes formais e diretas, como se fossem trechos de um edital.
Extraia também até 5 keywords importantes (termos concretos) para busca textual.

Regras:
- Use linguagem formal, objetiva e compatível com editais de concurso público.
- Se a pergunta já for formal, retorne-a como primeira variante.
- Keywords devem ser substantivos/proprios (ex: "matemática", "conteúdo programático").
- Responda APENAS com JSON no formato exato abaixo (sem Markdown, sem explicação):

{
  "queries": ["variante formal 1", "variante formal 2"],
  "keywords": ["palavra1", "palavra2"]
}"""


def _build_user_text(query: str, history: Optional[List[Dict[str, str]]]) -> str:
    parts = []
    if history:
        recent = history[-6:]
        parts.append("Histórico recente:")
        for msg in recent:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            label = "Usuário" if role == "user" else "Assistente"
            parts.append(f"{label}: {content}")
    parts.append(f"Pergunta atual: {query}")
    return "\n".join(parts)


def _recover_json(text: str) -> str:
    """Fecha chaves/colchetes desbalanceados antes de fazer parse."""
    text = text.strip()
    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    # Fechar na ordem inversa de abertura (LIFO)
    stack = []
    for char in text:
        if char in '{[':
            stack.append(char)
        elif char in '}]':
            if stack:
                stack.pop()
    
    # Fechar o que sobrou na stack
    for char in reversed(stack):
        if char == '{':
            text += '}'
        elif char == '[':
            text += ']'

    return text


def _parse_rewrite_response(text: str) -> Dict[str, List[str]]:
    """Parse da resposta do LLM para o formato esperado."""
    try:
        text = _recover_json(text)
        data = json.loads(text)
        queries = data.get("queries", [])
        keywords = data.get("keywords", [])

        if not isinstance(queries, list):
            queries = []
        if not isinstance(keywords, list):
            keywords = []

        queries = [str(q).strip() for q in queries if str(q).strip()]
        keywords = [str(k).strip() for k in keywords if str(k).strip()]

        return {"queries": queries, "keywords": keywords}
    except (json.JSONDecodeError, AttributeError) as e:
        logger.warning("Falha ao parsear query rewrite: %s", e)
        return {"queries": [], "keywords": []}


async def rewrite_query(
    query: str,
    history: Optional[List[Dict[str, str]]] = None,
    user_id: Optional[str] = None,
) -> Dict[str, List[str]]:
    """Reescreve a query do usuário para melhor retrieval.

    Args:
        query: Pergunta original do usuário.
        history: Últimas mensagens da conversa (opcional).
        user_id: ID do usuário para tracking/custo.

    Returns:
        Dict com 'queries' (lista de variantes) e 'keywords'.
        Em caso de falha, retorna a query original como única variante.
    """
    if not query or not query.strip():
        return {"queries": [], "keywords": []}

    user_text = _build_user_text(query, history)

    # Cache: queries curtas e comuns se repetem (ex: "cai matemática?")
    cached = get_cached(DEFAULT_MODEL, _REWRITE_SYSTEM_PROMPT, user_text, "chat_query_rewrite")
    if cached is not None:
        parsed = _parse_rewrite_response(cached)
        if parsed["queries"]:
            return parsed

    try:
        content = await generate_text(
            system_prompt=_REWRITE_SYSTEM_PROMPT,
            user_text=user_text,
            feature="chat_query_rewrite",
            max_tokens=300,
            temperature=0.1,
            user_id=user_id,
        )
    except Exception as e:
        logger.warning("LLM query rewrite falhou: %s", e)
        return {"queries": [query], "keywords": []}

    parsed = _parse_rewrite_response(content)
    if not parsed["queries"]:
        # Fallback gracioso
        return {"queries": [query], "keywords": []}

    return parsed
