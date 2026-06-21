import logging
import os
from datetime import date, timedelta
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_progress(user_id: str, document_id: str) -> list[dict]:
    supabase = _get_supabase()
    result = (
        supabase.table("student_progress")
        .select("*")
        .eq("user_id", user_id)
        .eq("document_id", document_id)
        .order("semana")
        .execute()
    )
    return result.data or []


def mark_progress(
    user_id: str,
    document_id: str,
    semana: int,
    disciplina: str,
    completed: bool = True,
    horas_estudadas: float = 0,
    nota: Optional[str] = None,
) -> dict:
    supabase = _get_supabase()
    now_iso = date.today().isoformat()

    result = (
        supabase.table("student_progress")
        .select("*")
        .eq("user_id", user_id)
        .eq("document_id", document_id)
        .eq("semana", semana)
        .eq("disciplina", disciplina)
        .limit(1)
        .execute()
    )

    if result.data:
        row_id = result.data[0]["id"]
        update_data = {
            "completed": completed,
            "horas_estudadas": horas_estudadas,
            "completed_at": now_iso if completed else None,
            "updated_at": "now()",
        }
        if nota is not None:
            update_data["nota"] = nota
        supabase.table("student_progress").update(update_data).eq("id", row_id).execute()
        return {"status": "updated", "id": row_id}
    else:
        insert_data = {
            "user_id": user_id,
            "document_id": document_id,
            "semana": semana,
            "disciplina": disciplina,
            "completed": completed,
            "horas_estudadas": horas_estudadas,
            "completed_at": now_iso if completed else None,
        }
        if nota is not None:
            insert_data["nota"] = nota
        result = supabase.table("student_progress").insert(insert_data).execute()
        return {"status": "created", "id": result.data[0]["id"] if result.data else None}


def get_progress_summary(user_id: str, document_id: str) -> dict:
    progress = get_progress(user_id, document_id)
    total_items = len(progress)
    completed_items = sum(1 for p in progress if p.get("completed"))
    total_horas = sum(p.get("horas_estudadas", 0) or 0 for p in progress)
    completed_by_disciplina = {}
    for p in progress:
        if p.get("completed"):
            disc = p["disciplina"]
            completed_by_disciplina[disc] = completed_by_disciplina.get(disc, 0) + 1
    return {
        "total_items": total_items,
        "completed_items": completed_items,
        "completion_rate": round(completed_items / total_items * 100, 1) if total_items else 0,
        "total_horas": round(total_horas, 1),
        "by_disciplina": completed_by_disciplina,
    }
