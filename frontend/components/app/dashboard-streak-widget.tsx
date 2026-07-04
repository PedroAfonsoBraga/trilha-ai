"use client";

import { DashboardStreak } from "@/types/documents";

interface StreakWidgetProps {
  streak: DashboardStreak | null;
}

export default function DashboardStreakWidget({ streak }: StreakWidgetProps) {
  if (!streak) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Streak indisponível.</p>
      </div>
    );
  }

  const { dias_consecutivos, maximo_historico, ultimo_dia } = streak;

  // Determina intensidade da chama
  let flameSize = "text-3xl";
  let label = "Continue estudando!";
  let bgIntensity = "bg-slate-50";

  if (dias_consecutivos === 0) {
    flameSize = "text-3xl opacity-40";
    label = "Volte a estudar!";
    bgIntensity = "bg-slate-50";
  } else if (dias_consecutivos <= 2) {
    flameSize = "text-3xl";
    label = "Começando bem!";
    bgIntensity = "bg-orange-50";
  } else if (dias_consecutivos <= 5) {
    flameSize = "text-4xl";
    label = "Bom ritmo!";
    bgIntensity = "bg-orange-50 border-orange-200";
  } else if (dias_consecutivos <= 10) {
    flameSize = "text-5xl";
    label = "Mandou bem!";
    bgIntensity = "bg-orange-100 border-orange-300";
  } else {
    flameSize = "text-5xl";
    label = "Incrível! 🔥";
    bgIntensity = "bg-orange-100 border-orange-300";
  }

  const ultimoDiaFormatado = ultimo_dia
    ? new Date(ultimo_dia + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div
      className={`rounded-xl border border-slate-200 ${bgIntensity} p-5 shadow-sm transition-colors`}
    >
      <div className="flex items-center gap-4">
        <span className={flameSize}>🔥</span>
        <div>
          <p className="text-3xl font-bold text-slate-900">
            {dias_consecutivos}
          </p>
          <p className="text-sm font-medium text-slate-600">
            {dias_consecutivos === 1 ? "dia seguido" : "dias seguidos"}
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-500">{label}</p>
      {ultimoDiaFormatado && dias_consecutivos > 0 && (
        <p className="mt-0.5 text-xs text-slate-400">
          Último estudo: {ultimoDiaFormatado}
        </p>
      )}
      {maximo_historico > 0 && (
        <p className="mt-0.5 text-xs text-slate-400">
          Recorde: {maximo_historico} {maximo_historico === 1 ? "dia" : "dias"}
        </p>
      )}
    </div>
  );
}
