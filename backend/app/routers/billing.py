import logging
import os
from datetime import datetime, timezone

import stripe
from dotenv import load_dotenv
from fastapi import APIRouter, Request, HTTPException
from supabase import create_client, Client

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _get(obj, key: str, default=None):
    """Safe get para StripeObject (suporta só subscript, não .get())."""
    try:
        return obj[key]
    except (KeyError, AttributeError, TypeError):
        return default


SUBSCRIPTION_PLAN_MAP = {
    "price_1TeSV1JcyDCmwkxi6MP6xscY": "estudante",
    "price_1TeSV4JcyDCmwkxiIXNSXx4X": "pro",
    "price_1Tf8krJcyDCmwkxiXWDOxCde": "estudante",
    "price_1Tf8ktJcyDCmwkxieFJNkRfj": "pro",
}


def _ts_to_iso(ts: int | None) -> str | None:
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


@router.post("/webhook")
async def stripe_webhook(request: Request):
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature,
            secret=STRIPE_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = event["type"]
    logger.info("Webhook recebido: %s", event_type)

    try:
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(event)
        elif event_type in ("customer.subscription.created", "customer.subscription.updated"):
            await _handle_subscription_updated(event)
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(event)
        else:
            logger.info("Webhook ignorado: %s", event_type)
    except Exception as e:
        logger.exception("Erro ao processar webhook %s: %s", event_type, e)
        raise HTTPException(status_code=500, detail=str(e))

    return {"received": True}


async def _handle_checkout_completed(event: dict) -> None:
    session = event["data"]["object"]
    metadata = _get(session, "metadata", {})
    user_id = _get(metadata, "user_id")
    stripe_customer_id = _get(session, "customer")
    stripe_subscription_id = _get(session, "subscription")

    if not user_id or not stripe_subscription_id:
        logger.warning(
            "checkout.session.completed sem user_id ou subscription: user=%s sub=%s",
            user_id, stripe_subscription_id,
        )
        return

    subscription = stripe.Subscription.retrieve(stripe_subscription_id)
    price_id = subscription["items"]["data"][0]["price"]["id"]
    plan = SUBSCRIPTION_PLAN_MAP.get(price_id, "free")

    supabase = get_supabase()

    supabase.table("subscriptions").upsert({
        "user_id": user_id,
        "stripe_subscription_id": stripe_subscription_id,
        "stripe_customer_id": stripe_customer_id,
        "plan": plan,
        "status": subscription["status"],
        "current_period_end": _ts_to_iso(_get(subscription, "current_period_end")),
    }, on_conflict="stripe_subscription_id").execute()

    supabase.table("profiles").update({
        "plano": plan,
    }).eq("id", user_id).execute()

    logger.info(
        "Upgrade concluído: user=%s plan=%s status=%s",
        user_id, plan, subscription["status"],
    )


async def _handle_subscription_updated(event: dict) -> None:
    subscription = event["data"]["object"]
    stripe_subscription_id = subscription["id"]
    price_id = subscription["items"]["data"][0]["price"]["id"]
    plan = SUBSCRIPTION_PLAN_MAP.get(price_id, "free")

    supabase = get_supabase()

    supabase.table("subscriptions").upsert({
        "stripe_subscription_id": stripe_subscription_id,
        "plan": plan,
        "status": subscription["status"],
        "current_period_end": _ts_to_iso(_get(subscription, "current_period_end")),
    }, on_conflict="stripe_subscription_id").execute()

    result = (
        supabase.table("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", stripe_subscription_id)
        .limit(1)
        .execute()
    )
    if result.data:
        supabase.table("profiles").update({
            "plano": plan,
        }).eq("id", result.data[0]["user_id"]).execute()

    logger.info(
        "Subscription atualizada: sub=%s plan=%s status=%s",
        stripe_subscription_id, plan, subscription["status"],
    )


async def _handle_subscription_deleted(event: dict) -> None:
    subscription = event["data"]["object"]
    stripe_subscription_id = _get(subscription, "id")

    if not stripe_subscription_id:
        logger.warning("subscription.deleted sem id")
        return

    supabase = get_supabase()

    result = (
        supabase.table("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", stripe_subscription_id)
        .limit(1)
        .execute()
    )

    supabase.table("subscriptions").update({
        "status": "canceled",
        "plan": "free",
    }).eq("stripe_subscription_id", stripe_subscription_id).execute()

    if result.data:
        supabase.table("profiles").update({
            "plano": "free",
        }).eq("id", result.data[0]["user_id"]).execute()

    logger.info("Subscription cancelada: %s", stripe_subscription_id)
