"use client";

import { DashboardStreak, DashboardFlashcards, DashboardProgressoGeral } from "@/types/documents";

interface StatsGridProps {
  streak: DashboardStreak | null;
  flashcards: DashboardFlashcards | null;
  progressoGeral: DashboardProgressoGeral | null;
}

export default function DashboardStatsGrid({
  streak,
  flashcards,
  progressoGeral,
}: StatsGridProps) {
  const stats = [
    {
      icon: "🔥",
      label: "Streak",
      value: streak ? `${streak.dias_consecutivos}` : "—",
      sub: streak?.dias_consecutivos === 1 ? "dia" : "dias",
      color: streak && streak.dias_consecutivos > 0 ? "text-orange-500" : "text-slate-400",
    },
    {
      icon: "📝",
      label: "Pendentes",
      value: flashcards ? `${flashcards.pendentes}` : "—",
      sub: flashcards?.pendentes === 1 ? "card" : "cards",
      color:
        flashcards && flashcards.pendentes > 0
          ? "text-amber-500"
          : "text-emerald-500",
    },
    {
      icon: "✅",
      label: "Precisão",
      value: flashcards ? `${flashcards.taxa_acerto}%` : "—",
      sub: flashcards ? `${flashcards.revisados_hoje} hoje` : "",
      color: "text-teal-600",
    },
    {
      icon: "⏱",
      label: "Horas",
      value: progressoGeral ? `${progressoGeral.horas_estudadas}h` : "—",
      sub: progressoGeral
        ? `${progressoGeral.total_documentos} documento${progressoGeral.total_documentos !== 1 ? "s" : ""}`
        : "",
      color: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{stat.icon}</span>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {stat.label}
            </span>
          </div>
          <p className={`mt-1.5 text-2xl font-bold ${stat.color}`}>
            {stat.value}
          </p>
          {stat.sub && (
            <p className="mt-0.5 text-xs text-slate-400">{stat.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
