import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <a
            href="/dashboard/concurso"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-slate-900">Concurso Assistant</h2>
            <p className="mt-2 text-sm text-slate-600">
              Faça upload de editais e gere cronogramas de estudo com IA.
            </p>
          </a>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm opacity-50">
            <h2 className="text-lg font-semibold text-slate-900">Flashcards IA</h2>
            <p className="mt-2 text-sm text-slate-600">
              Em breve — gere flashcards automaticamente dos seus PDFs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
