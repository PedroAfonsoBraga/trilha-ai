import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();

  let nome = user.email?.split("@")[0] || "Usuário";
  let plano = "free";
  let avatarUrl: string | null = null;

  if (session) {
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const profile = await res.json();
        nome = profile.nome || nome;
        plano = profile.plano || "free";
      }
    } catch {
      // fallback silencioso
    }
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar — fixa à esquerda */}
      <Sidebar nome={nome} plano={plano} />

      {/* Coluna direita: Header + Conteúdo */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-[240px]">
        <Header nome={nome} avatarUrl={avatarUrl} />

        {/* Área de conteúdo: children + right panel opcional */}
        <div className="flex flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
