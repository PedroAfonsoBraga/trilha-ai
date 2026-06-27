"use client";

import { useState } from "react";
import type { PlanUsage, SubscriptionInfo } from "@/types/documents";

interface Props {
  accessToken: string;
  usage: PlanUsage | null;
  subscription: SubscriptionInfo | null;
  apiUrl: string;
  priceIds: Record<string, string>;
}

const FEATURE_LABELS: Record<string, string> = {
  edital: "Editais",
  pdf: "PDFs",
  flashcard: "Flashcards por documento",
  fichamento: "Fichamentos",
};

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  estudante: "Estudante",
  pro: "Pro",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  trialing: "Período de teste",
  past_due: "Pagamento pendente",
  canceled: "Cancelado",
  free: "Gratuito",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function statusBadge(status: string): { label: string; color: string } {
  const colorMap: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trialing: "bg-blue-100 text-blue-700",
    past_due: "bg-red-100 text-red-700",
    canceled: "bg-slate-100 text-slate-500",
    free: "bg-slate-100 text-slate-600",
  };
  return {
    label: STATUS_LABELS[status] || status,
    color: colorMap[status] || "bg-slate-100 text-slate-600",
  };
}

export default function PlanoClient({ usage, subscription, priceIds }: Props) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState("");

  const plan = subscription?.plan || "free";
  const planName = PLAN_NAMES[plan] || plan;
  const badge = statusBadge(subscription?.status || "free");
  const isPaid = plan !== "free";

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    setPortalError("");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error || "Erro ao abrir portal");
      }
    } catch {
      setPortalError("Erro de conexão");
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleCheckout = async (priceId: string) => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Plan card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Plano {planName}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            {isPaid && subscription?.current_period_end && (
              <p className="mt-1 text-sm text-slate-500">
                Renovação em {formatDate(subscription.current_period_end)}
              </p>
            )}
          </div>
          {subscription?.has_portal && (
            <button
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              className="rounded-lg border border-teal-500 px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-50"
            >
              {loadingPortal ? "Abrindo..." : "Gerenciar assinatura"}
            </button>
          )}
        </div>
        {portalError && (
          <p className="mt-2 text-xs text-red-500">{portalError}</p>
        )}
      </div>

      {/* Usage bars */}
      {usage && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Uso do mês ({usage.mes_ano})
          </h2>
          <div className="space-y-4">
            {Object.entries(usage.features).map(([feature, f]) => {
              const label = FEATURE_LABELS[feature] || feature;
              const usado = f.usado;
              const limite = f.limite;
              const pct = limite ? Math.min((usado / limite) * 100, 100) : 100;
              const barColor = !limite
                ? "bg-teal-500"
                : pct >= 100
                  ? "bg-red-500"
                  : pct >= 70
                    ? "bg-amber-500"
                    : "bg-teal-500";

              return (
                <div key={feature}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className="text-xs text-slate-500">
                      {limite !== null ? `${usado} / ${limite}` : `${usado} usado${usado !== 1 ? "s" : ""} · Ilimitado`}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade options (only for free) */}
      {!isPaid && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Fazer upgrade</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">Estudante</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                R$19,90<span className="text-sm font-normal text-slate-500">/mês</span>
              </p>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                <li>Tudo ilimitado</li>
                <li>Todos os exports</li>
                <li>Suporte por email</li>
              </ul>
              <button
                onClick={() => handleCheckout(priceIds.estudante_mensal)}
                className="mt-4 w-full rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
              >
                Assinar Estudante
              </button>
            </div>

            <div className="rounded-lg border border-teal-300 bg-teal-50/30 p-4">
              <h3 className="font-semibold text-slate-900">
                Pro <span className="text-xs text-teal-600 ml-1">Recomendado</span>
              </h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                R$39,90<span className="text-sm font-normal text-slate-500">/mês</span>
              </p>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                <li>Tudo do Estudante</li>
                <li>Concurso Assistant (chat)</li>
                <li>Revisão espaçada</li>
                <li>Prioridade no suporte</li>
              </ul>
              <button
                onClick={() => handleCheckout(priceIds.pro_mensal)}
                className="mt-4 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Assinar Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
