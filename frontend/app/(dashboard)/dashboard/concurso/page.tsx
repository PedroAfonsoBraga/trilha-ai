import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UploadForm from "@/components/app/upload-form";

export default async function ConcursoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Concurso Assistant</h1>
          <p className="mt-1 text-slate-600">
            Faça upload de um edital em PDF para gerar cronograma de estudos e fichamento ABNT.
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm">
          <UploadForm />
        </div>
      </div>
    </div>
  );
}
