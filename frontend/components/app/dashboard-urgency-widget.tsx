"use client";

import { useRouter } from "next/navigation";
import { DashboardUrgencia } from "@/types/documents";

interface UrgencyWidgetProps {
  urgencia: DashboardUrgencia | null;
}

export default function DashboardUrgencyWidget({
  urgencia,
}: UrgencyWidgetProps) {
  const router = useRouter();

  // Não renderiza nada se não houver urgência ou se não estiver ativo
  if (!urgencia || !urgencia.ativo) {
    return null;
  }

  const { cards_atrasados, proximo_prazo } = urgencia;
  const hasUrgency = cards_atrasados > 0 || proximo_prazo !== null;

  if (!hasUrgency) {
    return null;
  }

  const isCritical = cards_atrasados >= 5 || (proximo_prazo?.dias_restantes ?? 30) <= 7;
  const bgColor = isCritical
    ? "border-red-300 bg-red-50"
    : "border-amber-300 bg-amber-50";
  const textColor = isCritical ? "text-red-700" : "text-amber-700";

  return (
    <div
      className={`rounded-xl border ${bgColor} p-5 shadow-sm ${textColor}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">{isCritical ? "🔴" : "⚠️"}</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            {isCritical ? "Atenção: Modo Urgência" : "Modo Urgência"}
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {cards_atrasados > 0 && (
              <li>
                <strong>{cards_atrasados}</strong>{" "}
                {cards_atrasados === 1 ? "card atrasado" : "cards atrasados"}{" "}
                para revisar
              </li>
            )}
            {proximo_prazo && (
              <li>
                <strong>{proximo_prazo.evento}</strong> em{" "}
                {proximo_prazo.dias_restantes === 0
                  ? "hoje!"
                  : proximo_prazo.dias_restantes === 1
                  ? "amanhã!"
                  : `${proximo_prazo.dias_restantes} dias`}
              </li>
            )}
          </ul>
          <div className="mt-3 flex gap-2">
            {cards_atrasados > 0 && (
              <button
                onClick={() => router.push("/dashboard/flashcards")}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                  isCritical
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                Revisar agora
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
