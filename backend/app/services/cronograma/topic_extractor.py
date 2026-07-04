"""
Extração de tópicos por disciplina a partir do Markdown do edital.

Usa DeepSeek V4 Flash (via llm_client) para identificar disciplinas e seus
tópicos EXATAMENTE como listados no edital.

- Persiste resultados em `edital_topicos` para evitar re-extrair.
- Usa `ai_cache` via `llm_client` (TTL 30 dias) para chamadas repetidas.
- Retry 1x em caso de falha.
- JSON recovery para respostas truncadas.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv

from app.models.cronograma import Disciplina, ExtractedTopics
from app.services import cache_service, llm_client

load_dotenv()

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Você é um especialista em editais de concursos públicos brasileiros.

Abaixo está o conteúdo de um edital em Markdown.

Sua tarefa:
1. Identificar todas as disciplinas listadas no edital.
2. Para cada disciplina, extrair EXATAMENTE os tópicos listados — use as palavras do edital, não resuma nem expanda.
3. Manter a ordem dos tópicos como aparece no edital.
4. Se um tópico tiver subtópicos, incluir cada um como item separado.
5. Se a disciplina não listar tópicos (apenas o nome), retornar "topicos": [] para essa disciplina.

Retorne APENAS um JSON válido neste formato, sem markdown, sem explicações:
{
  "disciplinas": [
    {
      "nome": "nome exato da disciplina no edital",
      "peso": 15.0,
      "topicos": ["tópico 1 exatamente como no edital", "tópico 2 exatamente como no edital"]
    }
  ]
}

Se peso não estiver claro, use null para "peso".
"""


def _recover_json(text: str) -> str:
    """Tenta recuperar JSONs truncados fechando chaves/colchets pendentes."""
    text = text.strip()
    # Remove blocos markdown se sobrarem
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    open_braces = text.count("{") - text.count("}")
    open_brackets = text.count("[") - text.count("]")

    if open_braces > 0:
        text += "}" * open_braces
    if open_brackets > 0:
        text += "]" * open_brackets

    return text


def _parse_topics_json(text: str) -> list[Disciplina]:
    """Faz parse do JSON retornado pela IA, com recovery."""
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        recovered = _recover_json(text)
        try:
            data = json.loads(recovered)
        except json.JSONDecodeError as e:
            logger.error("Falha ao fazer parse do JSON de tópicos mesmo após recovery: %s", e)
            raise

    disciplinas = []
    for d in data.get("disciplinas", []):
        disciplinas.append(Disciplina(
            nome=str(d.get("nome", "")).strip(),
            peso=float(d["peso"]) if d.get("peso") is not None else None,
            topicos=[str(t).strip() for t in d.get("topicos", []) if str(t).strip()],
        ))
    return disciplinas


def _get_supabase():
    from supabase import create_client
    import os
    return create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))


async def _call_gemini_for_topics(edital_markdown: str, user_id: str) -> list[Disciplina]:
    """Chama DeepSeek V4 Flash para extrair tópicos, com cache via llm_client."""
    text = await llm_client.generate_text(
        system_prompt=SYSTEM_PROMPT,
        user_text=f"Edital:\n{edital_markdown}",
        feature="topic_extractor",
        max_tokens=8192,
        temperature=0.2,
        user_id=user_id,
    )
    return _parse_topics_json(text)


async def _persist_topics(edital_id: str, disciplinas: list[Disciplina]) -> None:
    """Salva/atualiza tópicos na tabela `edital_topicos`.

    Usa upsert com ignore_duplicates para evitar condição de corrida
    quando duas chamadas concorrentes tentam persistir os mesmos tópicos
    (erro "duplicate key value violates unique constraint").

    Remove tópicos que não estão mais na nova extração atômica:
      1. Deleta todos os tópicos existentes do edital.
      2. Insere os novos (se houver).
    """
    supabase = _get_supabase()

    # Remove tópicos antigos do edital (pode falhar silenciosamente se
    # outra chamada já deletou — isso é esperado em concorrência).
    try:
        supabase.table("edital_topicos").delete().eq("edital_id", edital_id).execute()
    except Exception:
        pass

    inserts = []
    ordem_global = 0
    for disc in disciplinas:
        for topico in disc.topicos:
            inserts.append({
                "edital_id": edital_id,
                "disciplina": disc.nome,
                "topico": topico,
                "ordem": ordem_global,
            })
            ordem_global += 1

    if inserts:
        supabase.table("edital_topicos").upsert(
            inserts,
            on_conflict="edital_id,disciplina,topico",
            ignore_duplicates=True,
        ).execute()


async def _load_cached_topics(edital_id: str) -> list[Disciplina] | None:
    """Carrega tópicos já persistidos em `edital_topicos`."""
    supabase = _get_supabase()
    result = (
        supabase.table("edital_topicos")
        .select("disciplina, topico, ordem")
        .eq("edital_id", edital_id)
        .order("ordem")
        .execute()
    )
    if not result.data:
        return None

    # Reagrupa por disciplina
    disc_map: dict[str, list[str]] = {}
    for row in result.data:
        disc_map.setdefault(row["disciplina"], []).append(row["topico"])

    # Busca pesos no documento (não persistimos peso em edital_topicos)
    doc_result = (
        supabase.table("documents")
        .select("metadata")
        .eq("id", edital_id)
        .limit(1)
        .execute()
    )
    peso_map: dict[str, float] = {}
    if doc_result.data:
        parsed = (doc_result.data[0].get("metadata") or {}).get("parsed") or {}
        for d in parsed.get("disciplinas", []):
            nome = d.get("nome", "")
            if nome and d.get("peso") is not None:
                try:
                    peso_map[nome] = float(d["peso"])
                except (ValueError, TypeError):
                    pass

    return [
        Disciplina(nome=nome, peso=peso_map.get(nome), topicos=topicos)
        for nome, topicos in disc_map.items()
    ]


async def extract_topics_from_edital(
    edital_id: str,
    edital_markdown: str,
    user_id: str,
    force_refresh: bool = False,
) -> ExtractedTopics:
    """Extrai tópicos do edital usando DeepSeek V4 Flash e os persiste.

    Args:
        edital_id: ID do documento (edital).
        edital_markdown: Texto em Markdown do edital.
        user_id: ID do usuário (para tracking de custo e RLS).
        force_refresh: Se True, ignora cache/persistência e re-extrai.

    Returns:
        ExtractedTopics com disciplinas e tópicos.
    """
    if not force_refresh:
        cached = await _load_cached_topics(edital_id)
        if cached is not None:
            logger.info("Tópicos carregados do cache para edital %s", edital_id[:8])
            has_vague = any(len(d.topicos) == 0 for d in cached)
            return ExtractedTopics(
                edital_id=edital_id,
                disciplinas=cached,
                extracted_at=datetime.now(timezone.utc).isoformat(),
                has_vague_topics=has_vague,
            )

    try:
        disciplinas = await _call_gemini_for_topics(edital_markdown, user_id)
    except Exception as e:
        logger.error("Falha na extração de tópicos (tentativa 1): %s", e)
        try:
            disciplinas = await _call_gemini_for_topics(edital_markdown, user_id)
        except Exception as e2:
            logger.error("Falha na extração de tópicos (tentativa 2): %s", e2)
            raise

    # Limpa disciplinas sem nome e topicos vazios explicitamente permitidos
    disciplinas = [d for d in disciplinas if d.nome]

    await _persist_topics(edital_id, disciplinas)

    has_vague = any(len(d.topicos) == 0 for d in disciplinas)
    return ExtractedTopics(
        edital_id=edital_id,
        disciplinas=disciplinas,
        extracted_at=datetime.now(timezone.utc).isoformat(),
        has_vague_topics=has_vague,
    )
