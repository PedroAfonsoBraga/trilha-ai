import logging
import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.services.rate_limiter import get_user_plan

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


FREE_LIMITS = {
    "edital": 3,
    "pdf": 3,
    "flashcard": 5,
    "fichamento": 3,
    "tcc": 1,
}


@router.get("/usage")
async def get_usage(user: dict = Depends(get_current_user)):
    supabase = get_admin_supabase()
    mes_ano = datetime.now().strftime("%Y-%m")
    plan = get_user_plan(user["id"])

    result = (
        supabase.table("usage_tracking")
        .select("feature, quantidade")
        .eq("user_id", user["id"])
        .eq("mes_ano", mes_ano)
        .execute()
    )

    usage = {}
    for row in (result.data or []):
        feature = row["feature"]
        limite = None if plan in ("estudante", "pro") else FREE_LIMITS.get(feature)
        usage[feature] = {
            "usado": row["quantidade"],
            "limite": limite,
        }

    for feat, default_limit in FREE_LIMITS.items():
        if feat not in usage:
            limite = None if plan in ("estudante", "pro") else default_limit
            usage[feat] = {"usado": 0, "limite": limite}

    return {"mes_ano": mes_ano, "plano": plan, "features": usage}


@router.get("/subscription")
async def get_subscription(user: dict = Depends(get_current_user)):
    supabase = get_admin_supabase()

    result = (
        supabase.table("subscriptions")
        .select("plan, status, current_period_end, stripe_customer_id")
        .eq("user_id", user["id"])
        .execute()
    )

    active_sub = None
    for s in (result.data or []):
        if s.get("status") in ("active", "trialing"):
            active_sub = s
            break

    if not active_sub:
        profile_result = (
            supabase.table("profiles")
            .select("plano")
            .eq("id", user["id"])
            .limit(1)
            .execute()
        )
        plan = profile_result.data[0].get("plano", "free") if profile_result.data else "free"
        return {
            "plan": plan,
            "status": "free",
            "current_period_end": None,
            "has_portal": False,
        }

    return {
        "plan": active_sub.get("plan", "free"),
        "status": active_sub.get("status", "free"),
        "current_period_end": active_sub.get("current_period_end"),
        "has_portal": bool(active_sub.get("stripe_customer_id")),
    }
