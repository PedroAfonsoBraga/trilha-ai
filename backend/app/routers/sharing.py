import logging
import os
import uuid
from datetime import datetime, timedelta

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import get_current_user

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_admin_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


@router.post("/{document_id}/{export_type}")
async def create_share_link(
    document_id: str,
    export_type: str,
    user: dict = Depends(get_current_user),
):
    if export_type not in ("cronograma", "fichamento", "flashcards"):
        raise HTTPException(status_code=400, detail="Tipo de export inválido. Use: cronograma, fichamento, flashcards")

    supabase = get_admin_supabase()

    doc = (
        supabase.table("documents")
        .select("id, metadata")
        .eq("id", document_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not doc.data:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    content = doc.data[0].get("metadata", {}).get(export_type)
    if not content:
        raise HTTPException(status_code=400, detail=f"{export_type} ainda não foi gerado")

    existing = (
        supabase.table("shared_exports")
        .select("public_token, expires_at")
        .eq("user_id", user["id"])
        .eq("document_id", document_id)
        .eq("export_type", export_type)
        .limit(1)
        .execute()
    )

    if existing.data:
        share = existing.data[0]
        if datetime.fromisoformat(share["expires_at"].replace("Z", "+00:00")) > datetime.utcnow():
            return {
                "url": f"/share/{share['public_token']}",
                "expires_at": share["expires_at"],
                "existing": True,
            }

    public_token = str(uuid.uuid4()).replace("-", "")[:12]
    expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()

    supabase.table("shared_exports").insert({
        "user_id": user["id"],
        "document_id": document_id,
        "export_type": export_type,
        "public_token": public_token,
        "expires_at": expires_at,
    }).execute()

    return {
        "url": f"/share/{public_token}",
        "expires_at": expires_at,
        "existing": False,
    }


@router.get("/public/{token}")
async def get_shared_export(token: str):
    supabase = get_admin_supabase()

    result = (
        supabase.table("shared_exports")
        .select("id, user_id, document_id, export_type, expires_at")
        .eq("public_token", token)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Link não encontrado")

    share = result.data[0]

    if datetime.fromisoformat(share["expires_at"].replace("Z", "+00:00")) < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Link expirado")

    doc = (
        supabase.table("documents")
        .select("metadata, nome_original")
        .eq("id", share["document_id"])
        .limit(1)
        .execute()
    )

    if not doc.data:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    metadata = doc.data[0].get("metadata", {})

    export_type = share["export_type"]
    if export_type == "flashcards":
        flashcards = (
            supabase.table("flashcards")
            .select("frente, verso, tags")
            .eq("document_id", share["document_id"])
            .order("created_at")
            .execute()
        )
        content = flashcards.data or []
    else:
        content = metadata.get(export_type, {})

    return {
        "export_type": export_type,
        "nome_original": doc.data[0].get("nome_original", ""),
        "content": content,
    }
