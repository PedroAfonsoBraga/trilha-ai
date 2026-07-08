"use client";

import { CustoPorProvider } from "@/types/admin";

interface CustoTabelaProviderProps {
  dados: CustoPorProvider[];
}

function formatUsd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
}

export default function CustoTabelaProvider({ dados }: CustoTabelaProviderProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400 mb-4">
        Provider / Modelo
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="pb-3 font-medium">Provider</th>
              <th className="pb-3 font-medium">Modelo</th>
              <th className="pb-3 font-medium text-right">Custo total</th>
              <th className="pb-3 font-medium text-right">Chamadas</th>
              <th className="pb-3 font-medium text-right">Taxa erro</th>
              <th className="pb-3 font-medium text-right">Latência média</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {dados.map((item) => (
              <tr key={`${item.provider}-${item.model}`}>
                <td className="py-3 align-middle">
                  <span className="inline-flex items-center rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300">
                    {item.provider}
                  </span>
                </td>
                <td className="py-3 align-middle text-slate-200 font-medium">
                  {item.model}
                </td>
                <td className="py-3 text-right align-middle font-semibold text-slate-200">
                  {formatUsd(item.custo_total)}
                </td>
                <td className="py-3 text-right align-middle text-slate-400">
                  {item.qtd_chamadas.toLocaleString("pt-BR")}
                </td>
                <td className="py-3 text-right align-middle">
                  <span
                    className={`font-medium ${
                      item.taxa_erro_percentual > 5
                        ? "text-red-400"
                        : item.taxa_erro_percentual > 0
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {item.taxa_erro_percentual.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 text-right align-middle text-slate-400">
                  {item.latencia_media_ms > 0
                    ? `${item.latencia_media_ms.toLocaleString("pt-BR")} ms`
                    : "-"}
                </td>
              </tr>
            ))}
            {dados.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  Nenhum dado no período selecionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
