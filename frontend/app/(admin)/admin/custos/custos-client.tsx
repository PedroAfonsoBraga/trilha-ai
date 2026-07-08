"use client";

import { useEffect, useState } from "react";
import CustoFiltroPeriodo from "@/components/app/admin/custo-filtro-periodo";
import CustoResumoCards from "@/components/app/admin/custo-resumo-cards";
import CustoGraficoDiario from "@/components/app/admin/custo-grafico-diario";
import CustoTabelaFeature from "@/components/app/admin/custo-tabela-feature";
import CustoTabelaProvider from "@/components/app/admin/custo-tabela-provider";
import CustoOutliersLista from "@/components/app/admin/custo-outliers-lista";
import {
  CustoResumo,
  CustoPorFeature,
  CustoPorProvider,
  CustoOutliersResponse,
  CustoCacheEconomia,
  CustoPorUsuarioResponse,
} from "@/types/admin";

interface Props {
  apiUrl: string;
  accessToken: string;
  initialResumo: CustoResumo | null;
  initialFeatures: CustoPorFeature[];
  initialProviders: CustoPorProvider[];
  initialOutliers: CustoOutliersResponse | null;
  initialCacheEconomia: CustoCacheEconomia | null;
}

function buildQuery(
  periodo: string,
  de?: string,
  ate?: string
): string {
  const params = new URLSearchParams();
  params.set("periodo", periodo);
  if (de) params.set("de", de);
  if (ate) params.set("ate", ate);
  return params.toString();
}

async function fetchJson<T>(
  url: string,
  accessToken: string
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`Erro ${res.status} em ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`Falha ao buscar ${url}:`, e);
    return null;
  }
}

export default function CustosClient({
  apiUrl,
  accessToken,
  initialResumo,
  initialFeatures,
  initialProviders,
  initialOutliers,
  initialCacheEconomia,
}: Props) {
  const [periodo, setPeriodo] = useState<string>("30d");

  const [resumo, setResumo] = useState<CustoResumo | null>(initialResumo);
  const [features, setFeatures] = useState<CustoPorFeature[]>(initialFeatures);
  const [providers, setProviders] = useState<CustoPorProvider[]>(initialProviders);
  const [outliers, setOutliers] = useState<CustoOutliersResponse | null>(initialOutliers);
  const [cacheEconomia, setCacheEconomia] = useState<CustoCacheEconomia | null>(
    initialCacheEconomia
  );
  const [usuarios, setUsuarios] = useState<CustoPorUsuarioResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = async (
    p: string,
    de?: string,
    ate?: string,
    withUsers = true
  ) => {
    setLoading(true);
    const query = buildQuery(p, de, ate);

    const [
      novoResumo,
      novasFeatures,
      novosProviders,
      novosOutliers,
      novaCacheEconomia,
      novosUsuarios,
    ] = await Promise.all([
      fetchJson<CustoResumo>(`${apiUrl}/api/admin/uso/resumo?${query}`, accessToken),
      fetchJson<CustoPorFeature[]>(
        `${apiUrl}/api/admin/uso/por-feature?${query}`,
        accessToken
      ),
      fetchJson<CustoPorProvider[]>(
        `${apiUrl}/api/admin/uso/por-provider?${query}`,
        accessToken
      ),
      fetchJson<CustoOutliersResponse>(
        `${apiUrl}/api/admin/uso/outliers?${query}`,
        accessToken
      ),
      fetchJson<CustoCacheEconomia>(
        `${apiUrl}/api/admin/uso/cache-economia?${query}`,
        accessToken
      ),
      withUsers
        ? fetchJson<CustoPorUsuarioResponse>(
            `${apiUrl}/api/admin/uso/por-usuario?${query}&limit=50`,
            accessToken
          )
        : Promise.resolve(null),
    ]);

    setResumo(novoResumo);
    setFeatures(novasFeatures ?? []);
    setProviders(novosProviders ?? []);
    setOutliers(novosOutliers);
    setCacheEconomia(novaCacheEconomia);
    setUsuarios(novosUsuarios);
    setLoading(false);
  };

  useEffect(() => {
    // Refetch inicial para usuários (não buscado no server component)
    fetchAll("30d", undefined, undefined, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, apiUrl]);

  const handlePeriodoChange = (
    novoPeriodo: string,
    de?: string,
    ate?: string
  ) => {
    setPeriodo(novoPeriodo);
    fetchAll(novoPeriodo, de, ate, true);
  };

  const usuariosAtivos = usuarios?.total ?? 0;

  return (
    <div className="space-y-8">
      <CustoFiltroPeriodo value={periodo} onChange={handlePeriodoChange} />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-teal-500" />
          Atualizando dados...
        </div>
      )}

      <CustoResumoCards
        resumo={resumo}
        cacheEconomia={cacheEconomia}
        usuariosAtivos={usuariosAtivos}
      />

      {resumo && <CustoGraficoDiario serie={resumo.custo_por_dia} />}

      <div className="grid gap-8 lg:grid-cols-2">
        <CustoTabelaFeature dados={features} />
        <CustoTabelaProvider dados={providers} />
      </div>

      <CustoOutliersLista dados={outliers} />
    </div>
  );
}
