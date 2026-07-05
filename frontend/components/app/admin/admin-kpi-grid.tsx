"use client";

import { AdminStats } from "@/types/admin";

interface AdminKpiGridProps {
  stats: AdminStats;
}

export default function AdminKpiGrid({ stats }: AdminKpiGridProps) {
  const items = [
    { label: "Usuários", value: stats.total_usuarios, icon: "👥" },
    { label: "Documentos", value: stats.total_documentos, icon: "📄" },
    { label: "Chunks", value: stats.total_chunks, icon: "🧩" },
    { label: "Flashcards", value: stats.total_flashcards, icon: "🎴" },
    { label: "Mensagens Chat", value: stats.total_mensagens_chat, icon: "💬" },
    { label: "Storage (GB)", value: stats.storage_gb, icon: "☁️", isDecimal: true },
    { label: "Custo IA total (USD)", value: stats.custo_ia_total_usd, icon: "💰", isDecimal: true },
    { label: "Custo IA mês (USD)", value: stats.custo_ia_mes_usd, icon: "📅", isDecimal: true },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {item.label}
            </span>
          </div>
          <p className="mt-1.5 text-xl font-bold text-slate-900">
            {item.isDecimal
              ? item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : item.value.toLocaleString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
}
