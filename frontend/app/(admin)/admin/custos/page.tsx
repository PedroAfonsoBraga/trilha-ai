import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CustosClient from "./custos-client";
import {
  CustoResumo,
  CustoPorFeature,
  CustoPorProvider,
  CustoOutliersResponse,
  CustoCacheEconomia,
} from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAdminJson<T>(
  accessToken: string,
  path: string
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function AdminCustosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Guard admin já existe no layout, mas reforçamos aqui para não buscar dados
  // desnecessários caso o layout mude no futuro.
  let isAdmin = false;
  try {
    const res = await fetch(`${API_URL}/api/admin/check`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      isAdmin = data.admin === true;
    }
  } catch {
    // fallback
  }

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Busca dados iniciais em paralelo (sem a lista de usuários — o client busca depois)
  const query = "periodo=30d";
  const [resumo, features, providers, outliers, cacheEconomia] = await Promise.all([
    fetchAdminJson<CustoResumo>(session.access_token, `/api/admin/uso/resumo?${query}`),
    fetchAdminJson<CustoPorFeature[]>(
      session.access_token,
      `/api/admin/uso/por-feature?${query}`
    ),
    fetchAdminJson<CustoPorProvider[]>(
      session.access_token,
      `/api/admin/uso/por-provider?${query}`
    ),
    fetchAdminJson<CustoOutliersResponse>(
      session.access_token,
      `/api/admin/uso/outliers?${query}`
    ),
    fetchAdminJson<CustoCacheEconomia>(
      session.access_token,
      `/api/admin/uso/cache-economia?${query}`
    ),
  ]);

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Custos de IA</h1>
            <p className="mt-1 text-sm text-slate-400">
              Monitoramento de uso e custo por feature, provider e usuário
            </p>
          </div>
          <a
            href="/admin"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          >
            ← Voltar ao Admin
          </a>
        </div>

        <CustosClient
          apiUrl={API_URL}
          accessToken={session.access_token}
          initialResumo={resumo}
          initialFeatures={features ?? []}
          initialProviders={providers ?? []}
          initialOutliers={outliers}
          initialCacheEconomia={cacheEconomia}
        />
      </div>
    </div>
  );
}
