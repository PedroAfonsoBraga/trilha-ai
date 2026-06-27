import logging
import os
from datetime import date
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")


def _get_client():
    import resend
    resend.api_key = RESEND_API_KEY
    return resend


async def enviar_email_lembrete_prazo(
    email: str,
    nome: Optional[str],
    cargo: str,
    orgao: str,
    data_prova: str,
    dias_restantes: int,
) -> bool:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY nao configurada")
        return False

    display_name = nome or "Estudante"
    prova_date = date.fromisoformat(data_prova)
    data_formatada = prova_date.strftime("%d/%m/%Y")

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto">
  <div style="background:#0d9488;padding:20px;text-align:center">
    <h1 style="color:white;margin:0;font-size:24px">Trilha</h1>
  </div>
  <div style="padding:24px">
    <h2>Olá, {display_name}!</h2>
    <p>Faltam <strong>{dias_restantes} dias</strong> para a prova de <strong>{cargo}</strong> ({orgao}).</p>
    <p>Data da prova: <strong>{data_formatada}</strong></p>
    <p>Revise seu cronograma de estudos na Trilha e intensifique a preparação:</p>
    <p style="text-align:center;margin:24px 0">
      <a href="{APP_URL}/dashboard" style="background:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold">Acessar Plataforma</a>
    </p>
    <p style="color:#64748b;font-size:14px">Gerado com Trilha — Inteligência Artificial para seus estudos.</p>
  </div>
</body>
</html>"""

    try:
        resend_client = _get_client()
        params = {
            "from": "onboarding@resend.dev",
            "to": [email],
            "subject": f"Faltam {dias_restantes} dias para sua prova de {cargo}",
            "html": html,
        }
        resend_client.Emails.send(params)
        logger.info(f"Email de lembrete enviado para {email}")
        return True
    except Exception as e:
        logger.error(f"Falha ao enviar email: {e}")
        return False


async def enviar_email_lembrete_estudo(
    email: str,
    nome: Optional[str],
) -> bool:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY nao configurada")
        return False

    display_name = nome or "Estudante"

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto">
  <div style="background:#0d9488;padding:20px;text-align:center">
    <h1 style="color:white;margin:0;font-size:24px">Trilha</h1>
  </div>
  <div style="padding:24px">
    <h2>Olá, {display_name}!</h2>
    <p>Não deixe de estudar hoje! Cada dia de dedicação te aproxima da aprovação.</p>
    <p>Retome seu cronograma e revise os flashcards do dia:</p>
    <p style="text-align:center;margin:24px 0">
      <a href="{APP_URL}/dashboard" style="background:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold">Estudar Agora</a>
    </p>
    <p style="color:#64748b;font-size:14px">Gerado com Trilha — Inteligência Artificial para seus estudos.</p>
  </div>
</body>
</html>"""

    try:
        resend_client = _get_client()
        params = {
            "from": "onboarding@resend.dev",
            "to": [email],
            "subject": "Volte aos estudos! Sua aprovação te espera",
            "html": html,
        }
        resend_client.Emails.send(params)
        logger.info(f"Email de lembrete de estudo enviado para {email}")
        return True
    except Exception as e:
        logger.error(f"Falha ao enviar email: {e}")
        return False


async def checar_e_notificar_prazos() -> dict:
    from supabase import create_client
    supabase = create_client(
        os.getenv("SUPABASE_URL", ""),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
    )

    notificados = 0
    erros = 0

    result = (
        supabase.table("documents")
        .select("id, user_id, metadata, nome_original")
        .eq("tipo", "edital")
        .execute()
    )

    hoje = date.today()

    for doc in (result.data or []):
        metadata = doc.get("metadata") or {}
        parsed = metadata.get("parsed", {})
        datas = parsed.get("datas_importantes", [])

        data_prova = None
        cargo = parsed.get("cargo", "Concurso")
        orgao = parsed.get("orgao", "")

        for d in datas:
            ev = (d.get("evento") or "").lower()
            if any(k in ev for k in ["prova", "avaliação", "aplicação", "concurso"]):
                data_prova = d.get("data")
                break

        if not data_prova and datas:
            data_prova = datas[-1].get("data")

        if not data_prova:
            continue

        try:
            prova_date = date.fromisoformat(data_prova)
        except (ValueError, TypeError):
            continue

        dias_restantes = (prova_date - hoje).days

        if dias_restantes in [30, 14, 7, 3, 1]:
            user_result = (
                supabase.table("profiles")
                .select("email, nome")
                .eq("id", doc["user_id"])
                .limit(1)
                .execute()
            )
            if user_result.data:
                profile = user_result.data[0]
                sent = await enviar_email_lembrete_prazo(
                    email=profile.get("email", ""),
                    nome=profile.get("nome"),
                    cargo=cargo,
                    orgao=orgao,
                    data_prova=data_prova,
                    dias_restantes=dias_restantes,
                )
                if sent:
                    notificados += 1
                else:
                    erros += 1

    return {"notificados": notificados, "erros": erros}
