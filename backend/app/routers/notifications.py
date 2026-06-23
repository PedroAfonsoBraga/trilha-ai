import logging
import os

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import get_current_user
from app.services import notifications_service, review_service

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


@router.get("/preferences")
async def get_notification_preferences(user: dict = Depends(get_current_user)):
    supabase = _get_supabase()
    result = (
        supabase.table("notification_preferences")
        .select("*")
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]
    return {
        "user_id": user["id"],
        "prazo_prova": True,
        "lembrete_estudo": True,
        "resumo_semanal": False,
    }


@router.post("/preferences")
async def update_notification_preferences(
    body: dict,
    user: dict = Depends(get_current_user),
):
    supabase = _get_supabase()

    result = (
        supabase.table("notification_preferences")
        .select("*")
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )

    data = {
        "prazo_prova": body.get("prazo_prova", True),
        "lembrete_estudo": body.get("lembrete_estudo", True),
        "resumo_semanal": body.get("resumo_semanal", False),
        "updated_at": "now()",
    }

    if result.data:
        supabase.table("notification_preferences").update(data).eq("user_id", user["id"]).execute()
    else:
        data["user_id"] = user["id"]
        supabase.table("notification_preferences").insert(data).execute()

    return {"status": "ok", "preferences": data}


@router.post("/check-deadlines")
async def trigger_deadline_check(user: dict = Depends(get_current_user)):
    result = await notifications_service.checar_e_notificar_prazos()
    return result


@router.post("/review-reminders")
async def trigger_review_reminders(user: dict = Depends(get_current_user)):
    result = await review_service.checar_e_notificar_revisoes()
    return result
