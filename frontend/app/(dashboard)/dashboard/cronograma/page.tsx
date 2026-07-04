import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CronogramaClient from "./cronograma-client";
import type { Document } from "@/types/documents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function CronogramaPage({
  searchParams,
}: {
  searchParams?: { edital?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || "";

  // Busca editais do usuário
  let editais: Document[] = [];
  try {
    const res = await fetch(`${API_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const docs = (await res.json()) as Document[];
      editais = docs.filter((d) => d.tipo === "edital");
    }
  } catch {
    // fallback silencioso
  }

  const editalIdSelecionado = searchParams?.edital || editais[0]?.id || null;

  // Busca perfil para plano
  let plano = "free";
  try {
    const res = await fetch(`${API_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const profile = await res.json();
      plano = profile.plano || "free";
    }
  } catch {
    // fallback
  }

  // Busca cronograma existente para o edital selecionado
  let cronogramaExistente = null;
  let cronogramaErro: string | null = null;
  if (editalIdSelecionado) {
    try {
      const res = await fetch(`${API_URL}/api/cronograma/${editalIdSelecionado}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (res.ok) {
        cronogramaExistente = await res.json();
      } else {
        cronogramaErro = `Erro ${res.status}`;
      }
    } catch {
      cronogramaErro = "Falha de conexão com o servidor";
    }
  }

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <CronogramaClient
        editais={editais}
        editalInicial={editalIdSelecionado}
        cronogramaInicial={cronogramaExistente}
        cronogramaErro={cronogramaErro}
        accessToken={accessToken}
        plano={plano}
      />
    </main>
  );
}
