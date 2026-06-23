import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();

  let perfil = "concurseiro";
  if (session) {
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const profile = await res.json();
        perfil = profile.perfil || "concurseiro";
        if (!profile.perfil) {
          redirect("/dashboard/onboarding");
        }
      }
    } catch {
      // fallback
    }
  }

  const saudacao = {
    concurseiro: "Sua jornada para aprovação começa aqui",
    universitario: "Organize seus estudos da faculdade",
    mestrando: "Aprofunde sua pesquisa acadêmica",
  }[perfil] || "Sua jornada para aprovação começa aqui";

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard
          </h1>
          <LogoutButton />
        </div>
        <div className="mt-8 rounded-xl bg-white p-8 shadow-sm">
          <p className="text-slate-600">
            Bem-vindo, {user.email}!
          </p>
          <p className="text-slate-500 text-sm mt-1">{saudacao}</p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/dashboard/concurso"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-slate-900">Concurso Assistant</h2>
            <p className="mt-2 text-sm text-slate-600">
              Faça upload de editais e gere cronogramas de estudo com IA.
            </p>
          </a>
          <a
            href="/dashboard/chat"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-slate-900">Chat com Documentos</h2>
            <p className="mt-2 text-sm text-slate-600">
              Converse com seus editais e PDFs — tire dúvidas com IA contextual.
            </p>
          </a>
          <a
            href="/dashboard/library"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-slate-900">Biblioteca</h2>
            <p className="mt-2 text-sm text-slate-600">
              Organize seus documentos com tags, busque por conteúdo e revise com inteligência.
            </p>
          </a>
          <a
            href="/dashboard/tcc"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-slate-900">TCC Assistant</h2>
            <p className="mt-2 text-sm text-slate-600">
              Analise estrutura, revise clareza e verifique referências ABNT do seu TCC com IA.
            </p>
          </a>
          <a
            href="/dashboard/plano"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-slate-900">Meu Plano</h2>
            <p className="mt-2 text-sm text-slate-600">
              Gerencie sua assinatura, veja seus limites de uso e faça upgrade.
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
