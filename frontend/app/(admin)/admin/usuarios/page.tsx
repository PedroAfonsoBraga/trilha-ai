import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UsuariosClient from "./usuarios-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function AdminUsuariosPage() {
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

  // Busca lista de usuários
  let usuariosData = null;
  try {
    const res = await fetch(`${API_URL}/api/admin/users?limit=50`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (res.ok) {
      usuariosData = await res.json();
    }
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Usuários</h1>
            <p className="text-sm text-slate-400 mt-1">
              {usuariosData?.total ?? "..."} usuário{(usuariosData?.total ?? 0) !== 1 ? "s" : ""} cadastrado{(usuariosData?.total ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <a
            href="/admin"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          >
            ← Voltar ao Admin
          </a>
        </div>

        <UsuariosClient
          accessToken={session.access_token}
          initialData={usuariosData}
          apiUrl={API_URL}
        />
      </div>
    </div>
  );
}
