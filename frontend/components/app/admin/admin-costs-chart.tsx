"use client";

import { AdminStats } from "@/types/admin";

interface AdminCostsChartProps {
  stats: AdminStats;
}

export default function AdminCostsChart({ stats }: AdminCostsChartProps) {
  const max = Math.max(stats.custo_ia_total_usd, stats.custo_ia_mes_usd, 0.01);
  const totalWidth = Math.min((stats.custo_ia_total_usd / max) * 100, 100);
  const monthWidth = Math.min((stats.custo_ia_mes_usd / max) * 100, 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
        Custos de IA
      </h2>

      <div className="mt-6 space-y-5">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Total acumulado</span>
            <span className="font-semibold text-slate-900">
              US$ {stats.custo_ia_total_usd.toFixed(4)}
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600"
              style={{ width: `${totalWidth}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Mês atual</span>
            <span className="font-semibold text-slate-900">
              US$ {stats.custo_ia_mes_usd.toFixed(4)}
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
              style={{ width: `${monthWidth}%` }}
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Estimativa baseada nos tokens registrados em <code>ai_usage_log</code>.
      </p>
    </div>
  );
}
