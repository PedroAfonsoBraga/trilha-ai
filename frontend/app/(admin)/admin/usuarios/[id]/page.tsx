import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UserDetailClient from "./user-detail-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;

  // Busca detalhes do usuário
  let userDetails = null;
  let fetchError = false;
  try {
    const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (res.ok) {
      userDetails = await res.json();
    } else {
      fetchError = true;
    }
  } catch {
    fetchError = true;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Detalhes do Usuário</h1>
            <p className="text-sm text-slate-400 mt-1">
              {userDetails?.email || id}
            </p>
          </div>
          <a
            href="/admin/usuarios"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          >
            ← Voltar
          </a>
        </div>

        <UserDetailClient
          data={userDetails}
          error={fetchError}
          accessToken={session.access_token}
          apiUrl={API_URL}
        />
      </div>
    </div>
  );
}
