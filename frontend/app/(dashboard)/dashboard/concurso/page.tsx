import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UploadForm from "@/components/app/upload-form";
import { DocumentList } from "./document-list";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DocItem {
  id: string;
  nome_original: string;
  tipo: string;
  created_at: string;
  processado: boolean;
}

export default async function ConcursoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || "";

  // Busca documentos existentes (edital + pdf_generico)
  // A API library não aceita múltiplos tipos — buscamos todos e filtramos no front
  let documentos: DocItem[] = [];
  try {
    const res = await fetch(`${API_URL}/api/library?limit=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const todos = data.documents || [];
      documentos = todos.filter(
        (d: DocItem) => d.tipo === "edital" || d.tipo === "pdf_generico"
      );
    }
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <a href="/dashboard" className="text-sm text-teal-600 hover:text-teal-700 mb-2 inline-block">
            &larr; Voltar ao Dashboard
          </a>
          <h1 className="text-2xl font-bold text-slate-900">Concurso Assistant</h1>
          <p className="mt-1 text-slate-600">
            Gerencie seus editais e PDFs de conteúdo. Selecione um existente ou faça upload de um novo.
          </p>
        </div>

        <DocumentList
          documentos={documentos}
          _accessToken={accessToken}
          uploadForm={<UploadForm />}
        />
      </div>
    </div>
  );
}
