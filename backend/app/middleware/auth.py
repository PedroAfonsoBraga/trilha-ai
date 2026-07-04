import logging
import os

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request
from supabase import create_client, Client

logger = logging.getLogger(__name__)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Admins: lista de emails separados por vírgula
ADMIN_EMAILS = [
    e.strip().lower()
    for e in os.getenv("ADMIN_EMAILS", "").split(",")
    if e.strip()
]


def get_supabase_admin() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split("Bearer ")[1]
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    try:
        result = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not result or not result.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = result.user.id
    email = result.user.email

    # Verifica se o usuário está suspenso (com fallback — se falhar, permite acesso)
    try:
        profile_result = (
            supabase.table("profiles")
            .select("plano")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if profile_result.data and len(profile_result.data) > 0:
            plano = profile_result.data[0].get("plano", "")
            if plano == "suspended":
                raise HTTPException(
                    status_code=403,
                    detail="Conta suspensa. Entre em contato com o suporte.",
                )
    except HTTPException:
        raise
    except Exception:
        logger.warning(
            "Falha ao verificar suspensão do usuário %s — permitindo acesso",
            user_id,
        )

    return {
        "id": user_id,
        "email": email,
    }


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Verifica se o usuário autenticado é administrador.

    Depende de get_current_user — deve vir DEPOIS no pipeline de dependências.
    """
    if not ADMIN_EMAILS:
        logger.warning("ADMIN_EMAILS não configurado — acesso admin negado para todos")
        raise HTTPException(status_code=403, detail="Acesso negado")

    if user.get("email", "").lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Acesso negado")

    return user
