import logging
import os
from datetime import date, datetime
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


async def _enviar_email_revisao(
    email: str,
    nome: Optional[str],
    cards_pendentes: list[dict],
) -> bool:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY nao configurada — email de revisao mockado")
        logger.info(
            f"[MOCK] Email de revisao para {email}: {len(cards_pendentes)} cards pendentes"
        )
        return True

    display_name = nome or "Estudante"

    cards_html = ""
    for card in cards_pendentes[:10]:
        frente = card.get("frente", "")[:120]
        cards_html += f"<li style='margin-bottom:8px;padding:8px;background:#f1f5f9;border-radius:6px'>{frente}</li>"

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto">
  <div style="background:#0d9488;padding:20px;text-align:center">
    <h1 style="color:white;margin:0;font-size:24px">Trilha</h1>
  </div>
  <div style="padding:24px">
    <h2>Olá, {display_name}!</h2>
    <p>Você tem <strong>{len(cards_pendentes)} flashcards</strong> para revisar hoje.</p>
    <p>A revisão espaçada é essencial para fixar o conteúdo na memória de longo prazo.</p>
    <ul style="list-style:none;padding:0">
      {cards_html}
    </ul>
    <p style="text-align:center;margin:24px 0">
      <a href="{APP_URL}/dashboard" style="background:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold">Revisar Agora</a>
    </p>
    <p style="color:#64748b;font-size:14px">Gerado com Trilha — Revisão Espaçada Inteligente.</p>
  </div>
</body>
</html>"""

    try:
        import resend
        resend.api_key = RESEND_API_KEY
        params = {
            "from": "onboarding@resend.dev",
            "to": [email],
            "subject": f"Revisão pendente: {len(cards_pendentes)} flashcards para hoje",
            "html": html,
        }
        resend.Emails.send(params)
        logger.info(f"Email de revisao enviado para {email}")
        return True
    except Exception as e:
        logger.error(f"Falha ao enviar email de revisao: {e}")
        return False


async def checar_e_notificar_revisoes() -> dict:
    supabase = _get_supabase()

    hoje = datetime.utcnow().isoformat()

    result = (
        supabase.table("flashcards")
        .select("id, user_id, frente, verso, next_review, interval_days")
        .lte("next_review", hoje)
        .execute()
    )

    cards = result.data or []
    if not cards:
        return {"notificados": 0, "erros": 0, "cards_pendentes": 0}

    cards_por_usuario: dict[str, list[dict]] = {}
    for card in cards:
        uid = card["user_id"]
        if uid not in cards_por_usuario:
            cards_por_usuario[uid] = []
        cards_por_usuario[uid].append(card)

    notificados = 0
    erros = 0

    for user_id, user_cards in cards_por_usuario.items():
        pref_result = (
            supabase.table("notification_preferences")
            .select("lembrete_estudo")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if pref_result.data:
            pref = pref_result.data[0]
            if not pref.get("lembrete_estudo", True):
                continue

        profile_result = (
            supabase.table("profiles")
            .select("email, nome")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if not profile_result.data:
            continue

        profile = profile_result.data[0]
        email = profile.get("email", "")
        nome = profile.get("nome")

        if not email:
            continue

        sent = await _enviar_email_revisao(
            email=email,
            nome=nome,
            cards_pendentes=user_cards,
        )
        if sent:
            notificados += 1
        else:
            erros += 1

    return {
        "notificados": notificados,
        "erros": erros,
        "cards_pendentes": len(cards),
    }
