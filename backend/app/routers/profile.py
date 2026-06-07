import logging
import os

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth import get_current_user

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


class ProfileUpdate(BaseModel):
    nome: str | None = None
    perfil: str | None = None


def get_admin_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


@router.get("")
async def get_profile(user: dict = Depends(get_current_user)):
    supabase = get_admin_supabase()

    result = (
        supabase.table("profiles")
        .select("id, email, nome, perfil, plano, created_at")
        .eq("id", user["id"])
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")

    return result.data[0]


@router.patch("")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    if payload.perfil and payload.perfil not in ("concurseiro", "universitario", "mestrando"):
        raise HTTPException(status_code=400, detail="Perfil deve ser: concurseiro, universitario ou mestrando")

    update_data = {}
    if payload.nome is not None:
        update_data["nome"] = payload.nome
    if payload.perfil is not None:
        update_data["perfil"] = payload.perfil

    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    supabase = get_admin_supabase()

    result = (
        supabase.table("profiles")
        .update(update_data)
        .eq("id", user["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")

    return result.data[0]
