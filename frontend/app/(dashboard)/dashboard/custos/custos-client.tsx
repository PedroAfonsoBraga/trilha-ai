"use client";

import { UserCostSummary } from "@/types/documents";

interface CustosClientProps {
  costData: UserCostSummary | null;
}

export default function CustosClient({ costData }: CustosClientProps) {
  if (!costData) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-4xl">📊</p>
        <p className="mt-3 text-sm text-slate-500">
          Nenhum dado de custo disponível ainda.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Os custos aparecerão após você usar funcionalidades com IA.
        </p>
      </div>
    );
  }

  const {
    total_chamadas,
    total_custo_brl,
    total_custo_usd,
    total_input_tokens,
    total_output_tokens,
    orcamento_mensal_usd,
    dentro_do_orcamento,
    periodo,
    por_feature,
  } = costData;

  const orcamento_brl = orcamento_mensal_usd * 5.5;
  const budgetPercent = orcamento_mensal_usd > 0
    ? Math.min((total_custo_usd / orcamento_mensal_usd) * 100, 100)
    : 0;

  const featureLabels: Record<string, string> = {
    flashcard: "Flashcards",
    edital_parser: "Parser de Edital",
    chat: "Chat",
    search_rerank: "Busca com Re-ranking",
    unknown: "Outros",
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Chamadas de IA"
          value={total_chamadas.toString()}
          icon="🤖"
        />
        <MetricCard
          label="Custo (BRL)"
          value={`R$ ${total_custo_brl.toFixed(2)}`}
          icon="💰"
          color={dentro_do_orcamento ? "text-emerald-600" : "text-red-600"}
        />
        <MetricCard
          label="Tokens de entrada"
          value={total_input_tokens.toLocaleString()}
          icon="📥"
        />
        <MetricCard
          label="Tokens de saída"
          value={total_output_tokens.toLocaleString()}
          icon="📤"
        />
      </div>

      {/* Orçamento */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Orçamento Mensal
          </h2>
          <span
            className={`text-sm font-medium ${
              dentro_do_orcamento ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {dentro_do_orcamento ? "✅ Dentro do orçamento" : "🔴 Acima do orçamento"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-500">
            R$ {total_custo_brl.toFixed(2)} usado
          </span>
          <span className="text-slate-500">
            Limite: R$ {orcamento_brl.toFixed(2)}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              dentro_do_orcamento
                ? "bg-gradient-to-r from-teal-400 to-teal-600"
                : "bg-gradient-to-r from-amber-400 to-red-500"
            }`}
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Período: {periodo.inicio} a {periodo.fim}
        </p>
      </div>

      {/* Por feature */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400 mb-4">
          Custos por Funcionalidade
        </h2>
        <div className="space-y-3">
          {Object.entries(por_feature).map(([key, data]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {featureLabels[key] || key}
                </p>
                <p className="text-xs text-slate-500">
                  {data.chamadas} chamada{data.chamadas !== 1 ? "s" : ""} ·{" "}
                  {data.input_tokens.toLocaleString()} in /{" "}
                  {data.output_tokens.toLocaleString()} out
                </p>
              </div>
              <span className="text-sm font-medium text-slate-700">
                R$ {(data.custo_usd * 5.5).toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color = "text-slate-900",
}: {
  label: string;
  value: string;
  icon: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>
      <p className={`mt-1.5 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
