import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResultTabs from "./result-tabs";
import type { Document } from "@/types/documents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getDocument(docId: string, accessToken: string): Promise<Document | null> {
  const res = await fetch(`${API_URL}/api/documents/${docId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ConcursoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const doc = await getDocument(id, session.access_token);

  if (!doc) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-slate-900">Documento não encontrado</h1>
          <a href="/dashboard/concurso" className="text-teal-600 hover:underline mt-4 inline-block">
            Voltar
          </a>
        </div>
      </div>
    );
  }

  const accessToken = session.access_token;
  const metadata = doc.metadata || {};
  const parsed = metadata.parsed || null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <a href="/dashboard/concurso" className="text-teal-600 hover:underline text-sm mb-2 inline-block">
            &larr; Voltar
          </a>
          <h1 className="text-2xl font-bold text-slate-900">{doc.nome_original}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tipo: {doc.tipo === "edital" ? "Edital" : "PDF de conteúdo"} &middot;{" "}
            {doc.texto_extraido ? `${doc.texto_extraido.length} caracteres extraídos` : "Sem texto extraído"}
          </p>
        </div>

        <ResultTabs
          docId={id}
          accessToken={accessToken}
          doc={doc}
          parsed={parsed}
        />
      </div>
    </div>
  );
}
