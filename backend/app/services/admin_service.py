"""
Admin Service — Agregação de dados para o painel administrativo.

Responsabilidades:
- Listar usuários com métricas de uso (documentos, custos IA, storage)
- Obter estatísticas globais da plataforma
- Detalhar informações de um usuário específico

NUNCA usar .single() — usar .limit(1).execute() + check manual.
"""

import logging
import os
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _safe_count(result, data_key="data") -> int:
    """Retorna count de um result Supabase de forma segura."""
    if hasattr(result, "count") and result.count is not None:
        return result.count
    return len(getattr(result, data_key, []) or [])


# ──────────────────────────────────────────────
#  Listar todos os usuários com métricas
# ──────────────────────────────────────────────

async def listar_usuarios(page: int = 1, limit: int = 20, search: str = "") -> dict:
    """Retorna lista paginada de usuários com métricas agregadas (batch queries)."""
    supabase = _get_supabase()

    # 1. Busca perfis (paginado)
    base_query = supabase.table("profiles")

    if search:
        escaped = search.replace("%", "\\%").replace("_", "\\_")
        base_query = supabase.table("profiles").or_(
            f"email.ilike.%{escaped}%,nome.ilike.%{escaped}%"
        )

    # Contagem com filtro aplicado
    count_result = base_query.select("id", count="exact").execute()
    total = _safe_count(count_result)

    result = (
        base_query
        .select("*")
        .order("created_at", desc=True)
        .range((page - 1) * limit, page * limit - 1)
        .execute()
    )
    perfis = result.data or []
    if not perfis:
        return {"usuarios": [], "total": total, "page": page, "limit": limit}

    uids = [p.get("id", "") for p in perfis]

    # 2. Batch: documentos por user_id (count + storage)
    docs_result = (
        supabase.table("documents")
        .select("user_id, metadata")
        .in_("user_id", uids)
        .execute()
    )
    docs_por_user: dict[str, list] = defaultdict(list)
    for d in docs_result.data or []:
        docs_por_user[d.get("user_id", "")].append(d)

    # 3. Batch: custos IA no mês
    hoje = datetime.now(timezone.utc)
    inicio_mes = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    cost_result = (
        supabase.table("ai_usage_log")
        .select("user_id, custo_estimado_usd")
        .in_("user_id", uids)
        .gte("created_at", inicio_mes.isoformat())
        .execute()
    )
    custo_por_user: dict[str, float] = defaultdict(float)
    for log in cost_result.data or []:
        custo_por_user[log.get("user_id", "")] += float(
            log.get("custo_estimado_usd", 0) or 0
        )

    # 4. Monta resposta
    usuarios = []
    for perfil in perfis:
        uid = perfil.get("id", "")
        docs = docs_por_user.get(uid, [])

        total_docs = len(docs)
        storage_bytes = sum(
            (d.get("metadata") or {}).get("tamanho_bytes", 0) or 0
            for d in docs
        )
        custo_mes = round(custo_por_user.get(uid, 0.0), 4)

        usuarios.append({
            "user_id": uid,
            "email": perfil.get("email", ""),
            "nome": perfil.get("nome", ""),
            "plano": perfil.get("plano", "free"),
            "perfil": perfil.get("perfil", "concurseiro"),
            "total_documentos": total_docs,
            "storage_bytes": storage_bytes,
            "storage_mb": round(storage_bytes / (1024 * 1024), 2),
            "custo_ia_mes_usd": custo_mes,
            "ultimo_acesso": perfil.get("updated_at") or perfil.get("created_at"),
            "criado_em": perfil.get("created_at"),
        })

    return {
        "usuarios": usuarios,
        "total": total,
        "page": page,
        "limit": limit,
    }


# ──────────────────────────────────────────────
#  Estatísticas globais
# ──────────────────────────────────────────────

async def obter_estatisticas_globais() -> dict:
    """Retorna métricas globais da plataforma."""
    supabase = _get_supabase()

    # Total de usuários
    users_result = supabase.table("profiles").select("id", count="exact").execute()
    total_usuarios = users_result.count if hasattr(users_result, "count") else 0

    # Total de documentos
    docs_result = supabase.table("documents").select("id", count="exact").execute()
    total_documentos = docs_result.count if hasattr(docs_result, "count") else 0

    # Total de chunks
    chunks_result = supabase.table("document_chunks").select("id", count="exact").execute()
    total_chunks = chunks_result.count if hasattr(chunks_result, "count") else 0

    # Total de flashcards
    fc_result = supabase.table("flashcards").select("id", count="exact").execute()
    total_flashcards = fc_result.count if hasattr(fc_result, "count") else 0

    # Total de mensagens de chat
    chat_result = supabase.table("chat_messages").select("id", count="exact").execute()
    total_mensagens = chat_result.count if hasattr(chat_result, "count") else 0

    # Custos totais de IA
    hoje = datetime.now(timezone.utc)
    inicio_mes = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    cost_result = (
        supabase.table("ai_usage_log")
        .select("custo_estimado_usd")
        .execute()
    )
    custo_total_usd = sum(
        float(log.get("custo_estimado_usd", 0) or 0)
        for log in (cost_result.data or [])
    )

    custo_mes_result = (
        supabase.table("ai_usage_log")
        .select("custo_estimado_usd")
        .gte("created_at", inicio_mes.isoformat())
        .execute()
    )
    custo_mes_usd = sum(
        float(log.get("custo_estimado_usd", 0) or 0)
        for log in (custo_mes_result.data or [])
    )

    # Storage total
    storage_result = supabase.table("documents").select("metadata").execute()
    storage_bytes = sum(
        (d.get("metadata") or {}).get("tamanho_bytes", 0) or 0
        for d in (storage_result.data or [])
    )

    # Distribuição de planos
    planos: dict[str, int] = {}
    planos_result = supabase.table("profiles").select("plano").execute()
    for p in (planos_result.data or []):
        plano = p.get("plano", "free")
        planos[plano] = planos.get(plano, 0) + 1

    return {
        "total_usuarios": total_usuarios,
        "total_documentos": total_documentos,
        "total_chunks": total_chunks,
        "total_flashcards": total_flashcards,
        "total_mensagens_chat": total_mensagens,
        "storage_bytes": storage_bytes,
        "storage_gb": round(storage_bytes / (1024 ** 3), 2),
        "custo_ia_total_usd": round(custo_total_usd, 4),
        "custo_ia_mes_usd": round(custo_mes_usd, 4),
        "distribuicao_planos": planos,
    }


# ──────────────────────────────────────────────
#  Detalhes de um usuário específico
# ──────────────────────────────────────────────

async def detalhes_usuario(user_id: str) -> dict | None:
    """Retorna informações detalhadas de um usuário."""
    supabase = _get_supabase()

    # Perfil (a coluna PK é "id", não "user_id")
    profile_result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not profile_result.data:
        return None
    perfil = profile_result.data[0]

    # Documentos
    docs_result = (
        supabase.table("documents")
        .select("id, nome_original, tipo, created_at, metadata")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    documentos = docs_result.data or []

    # Total de chunks
    doc_ids = [d["id"] for d in documentos]
    total_chunks = 0
    if doc_ids:
        chunks_result = (
            supabase.table("document_chunks")
            .select("id", count="exact")
            .in_("document_id", doc_ids)
            .execute()
        )
        total_chunks = chunks_result.count if hasattr(chunks_result, "count") else 0

    # Flashcards
    fc_result = (
        supabase.table("flashcards")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    total_flashcards = fc_result.count if hasattr(fc_result, "count") else 0

    # Custos IA (últimos 6 meses)
    seis_meses_atras = datetime.now(timezone.utc) - timedelta(days=180)
    logs_result = (
        supabase.table("ai_usage_log")
        .select("feature, input_tokens, output_tokens, custo_estimado_usd, created_at")
        .eq("user_id", user_id)
        .gte("created_at", seis_meses_atras.isoformat())
        .order("created_at", desc=True)
        .execute()
    )

    custo_por_mes: dict[str, float] = {}
    for log in logs_result.data or []:
        mes = (log.get("created_at") or "")[:7]  # YYYY-MM
        custo = float(log.get("custo_estimado_usd", 0) or 0)
        custo_por_mes[mes] = custo_por_mes.get(mes, 0) + custo

    # Subscriptions
    subs_result = (
        supabase.table("subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    subscription = subs_result.data[0] if subs_result.data else None

    return {
        "user_id": user_id,
        "email": perfil.get("email"),
        "nome": perfil.get("nome"),
        "plano": perfil.get("plano"),
        "perfil": perfil.get("perfil"),
        "criado_em": perfil.get("created_at"),
        "subscription": subscription,
        "documentos": [
            {
                "id": d["id"],
                "nome": d.get("nome_original"),
                "tipo": d.get("tipo"),
                "created_at": d.get("created_at"),
                "tamanho_bytes": (d.get("metadata") or {}).get("tamanho_bytes", 0),
            }
            for d in documentos
        ],
        "total_documentos": len(documentos),
        "total_chunks": total_chunks,
        "total_flashcards": total_flashcards,
        "custo_ia_por_mes": custo_por_mes,
    }


# ──────────────────────────────────────────────
#  Suspender / Reativar usuário
# ──────────────────────────────────────────────

async def suspender_usuario(user_id: str) -> dict:
    """Suspende um usuário, bloqueando seu acesso à plataforma."""
    supabase = _get_supabase()

    # Salva o plano original antes de suspender
    profile_result = (
        supabase.table("profiles")
        .select("plano")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not profile_result.data:
        return {"status": "error", "message": "Usuário não encontrado"}

    plano_original = profile_result.data[0].get("plano", "free")

    # Atualiza o plano para "suspended"
    supabase.table("profiles").update({"plano": "suspended"}).eq("id", user_id).execute()

    # Salva o plano original em metadata (para restauração futura)
    # Nota: profiles não tem coluna de metadata, usamos o campo plano
    # O plano original é retornado na resposta para o admin saber

    logger.info("Usuário %s suspenso (plano original: %s)", user_id, plano_original)

    return {
        "status": "suspended",
        "user_id": user_id,
        "plano_original": plano_original,
    }


async def reativar_usuario(user_id: str, plano_original: str = "free") -> dict:
    """Reativa um usuário suspenso, restaurando seu plano.

    Se o plano_original informado for "free" (default), tenta recuperar o
    plano real consultando a tabela subscriptions (status active/trialing).
    """
    supabase = _get_supabase()

    plano_final = plano_original

    # Se o admin não informou um plano específico (deixou o default "free"),
    # tenta recuperar o plano real da tabela subscriptions
    if plano_original == "free":
        sub_result = (
            supabase.table("subscriptions")
            .select("plan, status")
            .eq("user_id", user_id)
            .in_("status", ["active", "trialing"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if sub_result.data and len(sub_result.data) > 0:
            plano_final = sub_result.data[0].get("plan", "free")

    supabase.table("profiles").update({"plano": plano_final}).eq("id", user_id).execute()

    logger.info("Usuário %s reativado (plano: %s)", user_id, plano_final)

    return {
        "status": "active",
        "user_id": user_id,
        "plano_restaurado": plano_final,
    }


# ──────────────────────────────────────────────
#  Reembolso Stripe
# ──────────────────────────────────────────────

async def reembolsar_usuario(user_id: str) -> dict:
    """Reembolsa o último pagamento do usuário via Stripe."""
    import stripe

    supabase = _get_supabase()
    stripe_api_key = os.getenv("STRIPE_SECRET_KEY", "")

    if not stripe_api_key:
        return {"status": "error", "message": "STRIPE_SECRET_KEY não configurada"}

    # Busca a subscription ativa do usuário
    sub_result = (
        supabase.table("subscriptions")
        .select("stripe_customer_id, stripe_subscription_id, plan, status")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not sub_result.data:
        return {"status": "error", "message": "Usuário não possui assinatura no Stripe"}

    sub = sub_result.data[0]
    stripe_customer_id = sub.get("stripe_customer_id")

    if not stripe_customer_id:
        return {"status": "error", "message": "Usuário não possui customer_id no Stripe"}

    try:
        # Busca os últimos PaymentIntents do cliente
        intents = stripe.PaymentIntent.list(
            customer=stripe_customer_id,
            limit=10,
            api_key=stripe_api_key,
        )

        # Encontra uma charge não reembolsada nos intents
        charge_para_reembolsar = None
        amount_cents = 0
        payment_intent_id = ""

        for intent in intents.data:
            if intent.status != "succeeded" or intent.amount <= 0:
                continue
            charges = intent.charges.data if intent.charges else []
            for charge in charges:
                if not charge.refunded and charge.status == "succeeded":
                    charge_para_reembolsar = charge
                    amount_cents = charge.amount
                    payment_intent_id = intent.id
                    break
            if charge_para_reembolsar:
                break

        if not charge_para_reembolsar:
            return {
                "status": "error",
                "message": "Nenhum pagamento reembolsável encontrado para este usuário",
            }

        # Processa o reembolso via charge
        refund = stripe.Refund.create(
            charge=charge_para_reembolsar.id,
            reason="requested_by_customer",
            api_key=stripe_api_key,
        )

        logger.info(
            "Reembolso processado: user=%s, payment_intent=%s, charge=%s, valor=%d cents",
            user_id, payment_intent_id, charge_para_reembolsar.id, amount_cents,
        )

        return {
            "status": "refunded",
            "user_id": user_id,
            "payment_intent": payment_intent_id,
            "charge_id": charge_para_reembolsar.id,
            "amount_cents": amount_cents,
            "amount_formatted": f"R${amount_cents / 100:.2f}",
            "refund_id": refund.id,
        }

    except stripe.error.StripeError as e:
        logger.error("Erro Stripe ao reembolsar usuário %s: %s", user_id, e)
        return {
            "status": "error",
            "message": f"Erro do Stripe: {str(e)}",
        }
    except Exception as e:
        logger.error("Erro inesperado ao reembolsar usuário %s: %s", user_id, e)
        return {
            "status": "error",
            "message": f"Erro inesperado: {str(e)}",
        }
