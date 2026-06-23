import os
import stripe
from fastapi import APIRouter, Request, HTTPException
from supabase import create_client, Client

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


SUBSCRIPTION_PLAN_MAP = {
    "price_1TeSV1JcyDCmwkxi6MP6xscY": "estudante",
    "price_1TeSV4JcyDCmwkxiIXNSXx4X": "pro",
    "price_1Tf8krJcyDCmwkxiXWDOxCde": "estudante",
    "price_1Tf8ktJcyDCmwkxieFJNkRfj": "pro",
}


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

    supabase = get_supabase()

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        stripe_customer_id = session.get("customer")
        stripe_subscription_id = session.get("subscription")

        if user_id and stripe_subscription_id:
            subscription = stripe.Subscription.retrieve(stripe_subscription_id)
            price_id = subscription["items"]["data"][0]["price"]["id"]
            plan = SUBSCRIPTION_PLAN_MAP.get(price_id, "free")

            supabase.table("subscriptions").upsert({
                "user_id": user_id,
                "stripe_subscription_id": stripe_subscription_id,
                "stripe_customer_id": stripe_customer_id,
                "plan": plan,
                "status": subscription["status"],
                "current_period_end": subscription["current_period_end"],
            }, on_conflict="stripe_subscription_id").execute()

            supabase.table("profiles").update({
                "plano": plan,
            }).eq("id", user_id).execute()

    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        stripe_subscription_id = subscription["id"]
        price_id = subscription["items"]["data"][0]["price"]["id"]
        plan = SUBSCRIPTION_PLAN_MAP.get(price_id, "free")

        supabase.table("subscriptions").update({
            "plan": plan,
            "status": subscription["status"],
            "current_period_end": subscription["current_period_end"],
        }).eq("stripe_subscription_id", stripe_subscription_id).execute()

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

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        stripe_subscription_id = subscription["id"]

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

    return {"received": True}
