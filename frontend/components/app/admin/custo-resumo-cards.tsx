"use client";

import { CustoResumo, CustoCacheEconomia } from "@/types/admin";

interface CustoResumoCardsProps {
  resumo: CustoResumo | null;
  cacheEconomia: CustoCacheEconomia | null;
  usuariosAtivos: number;
}

function formatUsd(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
}

export default function CustoResumoCards({
  resumo,
  cacheEconomia,
  usuariosAtivos,
}: CustoResumoCardsProps) {
  const custoUserMedio =
    resumo && usuariosAtivos > 0 ? resumo.custo_total_periodo / usuariosAtivos : 0;

  const cards = [
    {
      label: "Custo total",
      value: resumo ? formatUsd(resumo.custo_total_periodo) : "-",
      sub: resumo
        ? `${resumo.variacao_percentual >= 0 ? "+" : ""}${resumo.variacao_percentual.toFixed(1)}% vs anterior`
        : undefined,
      cor: "text-white",
    },
    {
      label: "Custo / usuário médio",
      value: formatUsd(custoUserMedio),
      sub: `${usuariosAtivos} usuário${usuariosAtivos !== 1 ? "s" : ""} ativo${usuariosAtivos !== 1 ? "s" : ""}`,
      cor: "text-white",
    },
    {
      label: "Chamadas totais",
      value: resumo ? resumo.chamadas_totais.toLocaleString("pt-BR") : "-",
      sub: resumo ? `${resumo.tokens_totais.toLocaleString("pt-BR")} tokens` : undefined,
      cor: "text-white",
    },
    {
      label: "Economia via cache",
      value: cacheEconomia ? formatUsd(cacheEconomia.economia_total_usd) : "-",
      sub: cacheEconomia
        ? `${cacheEconomia.chamadas_economizadas.toLocaleString("pt-BR")} chamada${cacheEconomia.chamadas_economizadas !== 1 ? "s" : ""} economizada${cacheEconomia.chamadas_economizadas !== 1 ? "s" : ""}`
        : undefined,
      cor: "text-teal-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-700 bg-slate-800 p-5"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {card.label}
          </p>
          <p className={`mt-2 text-2xl font-bold ${card.cor}`}>{card.value}</p>
          {card.sub && <p className="mt-1 text-xs text-slate-500">{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}
