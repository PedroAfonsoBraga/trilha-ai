import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminDashboardContent from "./admin-content";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Verifica se é admin
  let isAdmin = false;
  let adminEmail = "";
  try {
    const res = await fetch(`${API_URL}/api/admin/check`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      isAdmin = data.admin === true;
      adminEmail = data.email || "";
    }
  } catch {
    // fallback
  }

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Busca estatísticas
  let stats = null;
  let statsError: string | null = null;
  try {
    const res = await fetch(`${API_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (res.ok) {
      stats = await res.json();
    } else {
      statsError = `Erro ${res.status}`;
    }
  } catch {
    statsError = "Falha de conexão com o servidor";
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin</h1>
            <p className="text-sm text-slate-400 mt-1">
              Painel administrativo — {adminEmail}
            </p>
          </div>
          <a
            href="/dashboard"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          >
            ← Voltar ao Dashboard
          </a>
        </div>

        <AdminDashboardContent stats={stats} error={statsError} accessToken={session.access_token} />
      </div>
    </div>
  );
}
