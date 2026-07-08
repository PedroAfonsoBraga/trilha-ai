"use client";

import { CustoPorFeature } from "@/types/admin";

interface CustoTabelaFeatureProps {
  dados: CustoPorFeature[];
}

function formatUsd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
}

export default function CustoTabelaFeature({ dados }: CustoTabelaFeatureProps) {
  const maxCusto = Math.max(...dados.map((d) => d.custo_total), 0.001);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400 mb-4">
        Custo por feature
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="pb-3 font-medium">Feature</th>
              <th className="pb-3 font-medium text-right">Custo total</th>
              <th className="pb-3 font-medium text-right">% do total</th>
              <th className="pb-3 font-medium text-right">Chamadas</th>
              <th className="pb-3 font-medium text-right">Média/chamada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {dados.map((item) => (
              <tr key={item.feature} className="group">
                <td className="py-3 align-middle">
                  <span className="font-medium text-slate-200">{item.feature}</span>
                  <div className="mt-1 h-1.5 w-full min-w-[120px] overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600"
                      style={{ width: `${Math.min((item.custo_total / maxCusto) * 100, 100)}%` }}
                    />
                  </div>
                </td>
                <td className="py-3 text-right align-middle font-semibold text-slate-200">
                  {formatUsd(item.custo_total)}
                </td>
                <td className="py-3 text-right align-middle text-slate-400">
                  {item.percentual_do_total.toFixed(1)}%
                </td>
                <td className="py-3 text-right align-middle text-slate-400">
                  {item.qtd_chamadas.toLocaleString("pt-BR")}
                </td>
                <td className="py-3 text-right align-middle text-slate-400">
                  {formatUsd(item.custo_medio_por_chamada)}
                </td>
              </tr>
            ))}
            {dados.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
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
