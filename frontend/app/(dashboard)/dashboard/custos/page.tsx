import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CustosClient from "./custos-client";
import type { UserCostSummary } from "@/types/documents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function CustosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || "";

  let costData: UserCostSummary | null = null;

  if (accessToken) {
    try {
      const res = await fetch(`${API_URL}/api/user/costs`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (res.ok) costData = await res.json();
    } catch {
      // fallback
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Custos de IA
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Acompanhe o uso e custo das chamadas de inteligência artificial.
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-teal-600 hover:text-teal-700"
          >
            Voltar ao Dashboard
          </a>
        </div>

        <CustosClient costData={costData} />
      </div>
    </div>
  );
}
