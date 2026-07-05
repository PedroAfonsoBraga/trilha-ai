"use client";

import { AdminStats } from "@/types/admin";

interface AdminPlansDistributionProps {
  distribuicao: AdminStats["distribuicao_planos"];
}

const COLORS = ["#0D9488", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function AdminPlansDistribution({ distribuicao }: AdminPlansDistributionProps) {
  const entries = Object.entries(distribuicao || {});
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Distribuição de Planos
        </h2>
        <p className="mt-4 text-sm text-slate-500">Nenhum usuário registrado ainda.</p>
      </div>
    );
  }

  let cumulative = 0;
  const slices = entries.map(([plano, count], index) => {
    const percentage = count / total;
    const start = cumulative;
    cumulative += percentage;
    return {
      plano,
      count,
      percentage,
      start,
      end: cumulative,
      color: COLORS[index % COLORS.length],
    };
  });

  const gradient = slices
    .map(
      (s) =>
        `${s.color} ${(s.start * 100).toFixed(2)}% ${(s.end * 100).toFixed(2)}%`
    )
    .join(", ");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
        Distribuição de Planos
      </h2>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <div
          className="h-32 w-32 rounded-full"
          style={{
            background: `conic-gradient(${gradient})`,
          }}
        />

        <ul className="flex-1 space-y-2">
          {slices.map((s) => (
            <li key={s.plano} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-medium text-slate-700 capitalize">{s.plano}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-900">{s.count}</span>
                <span className="ml-1 text-xs text-slate-400">
                  ({(s.percentage * 100).toFixed(1)}%)
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
