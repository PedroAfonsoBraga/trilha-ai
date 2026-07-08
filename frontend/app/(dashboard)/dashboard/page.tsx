import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardContent from "./dashboard-content";
import RightPanel from "@/components/dashboard/RightPanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();

  let dashboardData = null;
  let dashboardError: string | null = null;
  let plano = "free";
  let nome = user.email?.split("@")[0] || "Usuário";

  if (session) {
    // Busca dados do dashboard
    try {
      const dashRes = await fetch(`${API_URL}/api/dashboard/`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (dashRes.ok) {
        dashboardData = await dashRes.json();
      } else {
        dashboardError = `Erro ${dashRes.status}`;
      }
    } catch {
      dashboardError = "Falha de conexão com o servidor";
    }

    // Busca perfil (nome + plano)
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const profile = await res.json();
        plano = profile.plano || "free";
        nome = profile.nome || nome;
      }
    } catch {
      // fallback silencioso
    }
  }

  return (
    <>
      {/* Área principal do dashboard */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <DashboardContent
          data={dashboardData}
          error={dashboardError}
          nome={nome}
        />
      </main>

      {/* Painel lateral direito (apenas desktop >1280px) */}
      <RightPanel
        data={dashboardData}
        plano={plano}
      />
    </>
  );
}
