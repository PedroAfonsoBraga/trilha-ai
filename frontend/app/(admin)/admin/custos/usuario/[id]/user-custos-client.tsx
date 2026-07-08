"use client";

import { useState } from "react";
import CustoFiltroPeriodo from "@/components/app/admin/custo-filtro-periodo";
import { CustoUsuarioDetalhe } from "@/types/admin";

interface Props {
  userId: string;
  apiUrl: string;
  accessToken: string;
  initialData: CustoUsuarioDetalhe | null;
}

function formatUsd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function UserCustosClient({
  userId,
  apiUrl,
  accessToken,
  initialData,
}: Props) {
  const [data, setData] = useState<CustoUsuarioDetalhe | null>(initialData);
  const [periodo, _setPeriodo] = useState("30d");
  const [loading, setLoading] = useState(false);

  const fetchData = async (p: string, de?: string, ate?: string) => {
    _setPeriodo(p);
    setLoading(true);
    const params = new URLSearchParams();
    params.set("periodo", p);
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);

    try {
      const res = await fetch(
        `${apiUrl}/api/admin/uso/usuario/${userId}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error("Falha ao buscar detalhe de custos:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {data?.nome || "Usuário"}
            </h2>
            <p className="text-sm text-slate-400">{data?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-slate-700 px-3 py-1 text-sm font-medium text-slate-300">
              Plano: {data?.plano || "-"}
            </span>
            <span className="inline-flex items-center rounded-full bg-teal-900/50 px-3 py-1 text-sm font-medium text-teal-300">
              {formatUsd(data?.custo_total_periodo ?? 0)} no período
            </span>
          </div>
        </div>
      </div>

      <CustoFiltroPeriodo value={periodo} onChange={fetchData} />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-teal-500" />
          Atualizando...
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.por_feature.map((f) => (
              <div
                key={f.feature}
                className="rounded-xl border border-slate-700 bg-slate-800 p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {f.feature}
                </p>
                <p className="mt-1 text-xl font-bold text-white">
                  {formatUsd(f.custo_total)}
                </p>
                <p className="text-xs text-slate-500">
                  {f.qtd_chamadas.toLocaleString("pt-BR")} chamadas ·{" "}
                  {f.tokens_total.toLocaleString("pt-BR")} tokens
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400 mb-4">
              Histórico de chamadas
            </h3>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-800">
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 font-medium">Feature</th>
                    <th className="pb-3 font-medium">Modelo</th>
                    <th className="pb-3 font-medium text-right">Tokens</th>
                    <th className="pb-3 font-medium text-right">Custo</th>
                    <th className="pb-3 font-medium text-center">Cache</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {data.historico.map((h) => (
                    <tr key={h.id}>
                      <td className="py-2 text-slate-400 whitespace-nowrap">
                        {formatDate(h.created_at)}
                      </td>
                      <td className="py-2 text-slate-200">{h.feature}</td>
                      <td className="py-2 text-slate-400 text-xs">{h.model}</td>
                      <td className="py-2 text-right text-slate-400 text-xs">
                        {h.input_tokens.toLocaleString("pt-BR")} in /{" "}
                        {h.output_tokens.toLocaleString("pt-BR")} out
                      </td>
                      <td className="py-2 text-right font-medium text-slate-200">
                        {formatUsd(h.custo_estimado_usd)}
                      </td>
                      <td className="py-2 text-center">
                        {h.cache_hit ? (
                          <span className="text-teal-400 text-xs">Sim</span>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        {h.status === "sucesso" ? (
                          <span className="text-emerald-400 text-xs">OK</span>
                        ) : h.status === "erro" ? (
                          <span className="text-red-400 text-xs" title={h.erro_detalhe || ""}>
                            Erro
                          </span>
                        ) : (
                          <span className="text-amber-400 text-xs">Timeout</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.historico.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        Nenhum registro no período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
