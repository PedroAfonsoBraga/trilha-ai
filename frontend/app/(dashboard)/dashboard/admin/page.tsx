import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminClient from "./admin-client";
import type { AdminStats, AdminUsersResponse } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || "";

  if (!accessToken) {
    redirect("/login");
  }

  // Verifica se é admin
  let isAdmin = false;
  try {
    const checkRes = await fetch(`${API_URL}/api/admin/check`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    isAdmin = checkRes.ok;
  } catch {
    isAdmin = false;
  }

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Busca estatísticas globais
  let stats: AdminStats | null = null;
  try {
    const statsRes = await fetch(`${API_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (statsRes.ok) {
      stats = await statsRes.json();
    }
  } catch {
    // fallback: stats continua null
  }

  // Busca primeira página de usuários
  let usersResponse: AdminUsersResponse | null = null;
  try {
    const usersRes = await fetch(`${API_URL}/api/admin/users?page=1&limit=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (usersRes.ok) {
      usersResponse = await usersRes.json();
    }
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Painel Administrativo
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Métricas globais, usuários e custos da plataforma.
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-teal-600 hover:text-teal-700"
          >
            Voltar ao Dashboard
          </a>
        </div>

        <AdminClient
          stats={stats}
          usersResponse={usersResponse}
          accessToken={accessToken}
        />
      </div>
    </div>
  );
}
