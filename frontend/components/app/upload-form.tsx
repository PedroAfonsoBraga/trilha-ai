"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UploadResponse {
  id: string;
  tipo: string;
  nome_original: string;
  texto_extraido_length: number;
}

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<"edital" | "pdf_generico">("edital");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", tipo);

    try {
      const res = await fetch("http://localhost:8000/api/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 429) {
        setError("Limite de uploads atingido para o plano Free.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Erro ao fazer upload");
        return;
      }

      const data: UploadResponse = await res.json();
      router.push(`/dashboard/concurso/${data.id}`);
    } catch {
      setError("Erro de conexão com o servidor");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Tipo de documento
        </label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "edital" | "pdf_generico")}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="edital">Edital de concurso</option>
          <option value="pdf_generico">PDF genérico (fichamento)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Arquivo PDF
        </label>
        <div className="mt-1 flex justify-center rounded-lg border border-dashed border-slate-300 px-6 py-10">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="mt-4 flex text-sm leading-6 text-slate-600">
              <label className="relative cursor-pointer rounded-md font-semibold text-teal-600 hover:text-teal-500">
                <span>Selecionar arquivo</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-1">PDF até 50MB</p>
            {file && (
              <p className="text-sm text-teal-600 mt-2 font-medium">{file.name}</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={!file || uploading}
        className="w-full rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors font-medium"
      >
        {uploading ? "Processando..." : "Enviar e analisar"}
      </button>
    </form>
  );
}
