import os
from datetime import datetime

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_supabase_admin() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def check_rate_limit(user_id: str, feature: str, max_free: int = 3) -> bool:
    supabase = get_supabase_admin()

    profile = (
        supabase.table("profiles")
        .select("plano")
        .eq("id", user_id)
        .execute()
    )

    if profile.data and len(profile.data) > 0 and profile.data[0].get("plano") in ("estudante", "pro"):
        return True

    mes_ano = datetime.now().strftime("%Y-%m")

    usage = (
        supabase.table("usage_tracking")
        .select("quantidade")
        .eq("user_id", user_id)
        .eq("feature", feature)
        .eq("mes_ano", mes_ano)
        .execute()
    )

    current = usage.data[0].get("quantidade", 0) if usage.data and len(usage.data) > 0 else 0
    return current < max_free


def increment_usage(user_id: str, feature: str) -> None:
    supabase = get_supabase_admin()
    mes_ano = datetime.now().strftime("%Y-%m")

    supabase.rpc(
        "increment_usage",
        {"p_user_id": user_id, "p_feature": feature, "p_mes_ano": mes_ano}
    ).execute()
