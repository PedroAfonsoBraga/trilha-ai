import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlanoClient from "./plano-client";
import DeleteAccountButton from "@/components/app/delete-account-button";
import type { PlanUsage, SubscriptionInfo } from "@/types/documents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PRICE_IDS: Record<string, string> = {
  estudante_mensal: process.env.NEXT_PUBLIC_STRIPE_ESTUDANTE_PRICE_ID || "price_1TeSV1JcyDCmwkxi6MP6xscY",
  estudante_anual: process.env.NEXT_PUBLIC_STRIPE_ESTUDANTE_ANUAL_PRICE_ID || "price_1Tf8krJcyDCmwkxiXWDOxCde",
  pro_mensal: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_1TeSV4JcyDCmwkxiIXNSXx4X",
  pro_anual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANUAL_PRICE_ID || "price_1Tf8ktJcyDCmwkxieFJNkRfj",
};

export default async function PlanoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || "";

  let usage: PlanUsage | null = null;
  let subscription: SubscriptionInfo | null = null;

  try {
    const [usageRes, subRes] = await Promise.all([
      fetch(`${API_URL}/api/profile/usage`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
      fetch(`${API_URL}/api/profile/subscription`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
    ]);

    if (usageRes.ok) usage = await usageRes.json();
    if (subRes.ok) subscription = await subRes.json();
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Meu Plano</h1>
            <p className="mt-1 text-slate-600">
              Gerencie sua assinatura e acompanhe seus limites de uso.
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-teal-600 hover:text-teal-700"
          >
            Voltar ao Dashboard
          </a>
        </div>

        <PlanoClient
          accessToken={accessToken}
          usage={usage}
          subscription={subscription}
          apiUrl={API_URL}
          priceIds={PRICE_IDS}
        />

        <div className="mt-10">
          <DeleteAccountButton
            accessToken={accessToken}
            userEmail={user.email || ""}
          />
        </div>
      </div>
    </div>
  );
}
