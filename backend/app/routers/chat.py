import logging
import os
from typing import Dict, List

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.middleware.auth import get_current_user
from app.services import chat_service

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


@router.post("")
async def chat_send_message(body: dict, user: dict = Depends(get_current_user)):
    messages: List[Dict[str, str]] = body.get("messages", [])
    document_ids: List[str] = body.get("document_ids", [])
    session_id: str | None = body.get("session_id")

    if not messages:
        raise HTTPException(status_code=400, detail="messages é obrigatório")

    if not document_ids:
        raise HTTPException(status_code=400, detail="Selecione pelo menos 1 documento")

    if len(document_ids) > 3:
        raise HTTPException(status_code=400, detail="Máximo de 3 documentos por chat")

    supabase = _get_supabase()
    result = (
        supabase.table("documents")
        .select("id")
        .eq("user_id", user["id"])
        .in_("id", document_ids)
        .execute()
    )
    owned_ids = {d["id"] for d in (result.data or [])}
    for did in document_ids:
        if did not in owned_ids:
            raise HTTPException(status_code=403, detail=f"Documento {did} não pertence ao usuário")

    async def event_generator():
        async for event in chat_service.chat_stream_response(
            messages=messages,
            document_ids=document_ids,
            user_id=user["id"],
            session_id=session_id,
        ):
            if event.startswith("data: "):
                yield {"data": event[6:].strip()}

        yield {"data": "[DONE]"}

    return EventSourceResponse(event_generator())


@router.get("/sessions")
async def list_chat_sessions(user: dict = Depends(get_current_user)):
    sessions = chat_service.get_sessions(user["id"])
    return sessions


@router.get("/sessions/{session_id}")
async def get_chat_session(session_id: str, user: dict = Depends(get_current_user)):
    messages = chat_service.get_session_messages(session_id, user["id"])
    if not messages:
        supabase = _get_supabase()
        result = (
            supabase.table("chat_sessions")
            .select("id")
            .eq("id", session_id)
            .eq("user_id", user["id"])
            .limit(1)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Sessão não encontrada")
        return []
    return messages


@router.get("/cost-check")
async def cost_check(body: dict = {}, user: dict = Depends(get_current_user)):
    tokens_entrada = body.get("tokens_entrada", 0)
    tokens_saida = body.get("tokens_saida", 0)

    preco_entrada = 0.14 / 1_000_000
    preco_saida = 0.28 / 1_000_000

    custo_usd = (tokens_entrada * preco_entrada) + (tokens_saida * preco_saida)
    custo_brl = custo_usd * 5.50

    return {
        "tokens_entrada": tokens_entrada,
        "tokens_saida": tokens_saida,
        "custo_usd": round(custo_usd, 6),
        "custo_brl": round(custo_brl, 6),
        "dentro_do_orcamento": custo_brl < 0.05,
    }
