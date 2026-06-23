import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TccUploadForm from "@/components/app/tcc-upload-form";

export default async function TccPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <a href="/dashboard" className="text-sm text-teal-600 hover:text-teal-700 mb-4 inline-block">
            &larr; Voltar ao Dashboard
          </a>
          <h1 className="text-2xl font-bold text-slate-900">TCC Assistant</h1>
          <p className="mt-1 text-slate-600">
            Faça upload do seu TCC em PDF ou DOCX para analisar estrutura, revisar clareza e verificar referências ABNT.
          </p>
        </div>
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <TccUploadForm />
        </div>
      </div>
    </div>
  );
}
