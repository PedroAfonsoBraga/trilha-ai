import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UserCustosClient from "./user-custos-client";
import { CustoUsuarioDetalhe } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUsuarioCustosPage({ params }: PageProps) {
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

  let initialData: CustoUsuarioDetalhe | null = null;
  try {
    const res = await fetch(
      `${API_URL}/api/admin/uso/usuario/${id}?periodo=30d`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      }
    );
    if (res.ok) {
      initialData = await res.json();
    }
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Detalhe de custos
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Histórico completo de uso de IA do usuário
            </p>
          </div>
          <a
            href="/admin/custos"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          >
            ← Voltar aos custos
          </a>
        </div>

        <UserCustosClient
          userId={id}
          apiUrl={API_URL}
          accessToken={session.access_token}
          initialData={initialData}
        />
      </div>
    </div>
  );
}
