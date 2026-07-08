"use client";

import { CustoOutliersResponse } from "@/types/admin";

interface CustoOutliersListaProps {
  dados: CustoOutliersResponse | null;
}

function formatUsd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
}

export default function CustoOutliersLista({ dados }: CustoOutliersListaProps) {
  if (!dados) return null;

  const { outliers, media, desvio_padrao, limite, amostra } = dados;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Outliers de custo
        </h2>
        <p className="text-xs text-slate-500">
          Média {formatUsd(media)} · DP {formatUsd(desvio_padrao)} · Limite{" "}
          {formatUsd(limite)} · n={amostra}
        </p>
      </div>

      {amostra < 5 && (
        <p className="mb-3 text-xs text-amber-400">
          Amostra pequena — outliers podem não ser representativos.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="pb-3 font-medium">Usuário</th>
              <th className="pb-3 font-medium">Plano</th>
              <th className="pb-3 font-medium text-right">Custo no período</th>
              <th className="pb-3 font-medium text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {outliers.map((item) => (
              <tr key={item.user_id}>
                <td className="py-3 align-middle">
                  <p className="font-medium text-slate-200">{item.nome}</p>
                  <p className="text-xs text-slate-500">{item.email}</p>
                </td>
                <td className="py-3 align-middle">
                  <span className="inline-flex items-center rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300">
                    {item.plano}
                  </span>
                </td>
                <td className="py-3 text-right align-middle font-semibold text-red-400">
                  {formatUsd(item.custo_total)}
                </td>
                <td className="py-3 text-right align-middle">
                  <a
                    href={`/admin/custos/usuario/${item.user_id}`}
                    className="text-xs font-medium text-teal-400 hover:text-teal-300"
                  >
                    Ver detalhes →
                  </a>
                </td>
              </tr>
            ))}
            {outliers.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  Nenhum outlier identificado no período
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
