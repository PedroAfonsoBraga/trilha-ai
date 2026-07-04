"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UploadResponse {
  id: string;
  tipo: string;
  nome_original: string;
  texto_extraido_length: number;
  cached: boolean;
  job_id: string | null;
}

interface ProgressEvent {
  type: string;
  status: string;
  stage: string;
  progress: number;
  error_msg?: string;
}

const STAGE_LABELS: Record<string, string> = {
  queued: "Na fila...",
  parsing: "Extraindo texto do PDF...",
  chunking: "Dividindo em trechos...",
  embedding: "Indexando para busca...",
  upsert: "Salvando no banco...",
  done: "Concluído!",
};

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<"edital" | "pdf_generico">("edital");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>("queued");
  const [failed, setFailed] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const terminalEventRef = useRef(false);

  function handleReset() {
    setFile(null);
    setUploading(false);
    setError(null);
    setProgress(0);
    setStage("queued");
    setFailed(false);
    setFormKey((k) => k + 1);
    terminalEventRef.current = false;
  }

  async function trackProgress(jobId: string, docId: string, accessToken: string) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos
    const STALL_WARNING_MS = 30 * 1000; // 30s sem evento → aviso
    const startedAt = Date.now();
    let lastEventAt = Date.now();
    terminalEventRef.current = false;

    try {
      const res = await fetch(`${API_URL}/api/documents/upload/${jobId}/stream`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok || !res.body) {
        setError("Erro ao acompanhar progresso do upload");
        setUploading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        // Timeout de segurança (10 min)
        if (Date.now() - startedAt > TIMEOUT_MS) {
          setError("O processamento excedeu o tempo limite. Tente novamente.");
          setUploading(false);
          return;
        }

        // Aviso se nenhum evento há 30s
        if (Date.now() - lastEventAt > STALL_WARNING_MS && progress < 85) {
          setStage("Aguardando processamento...");
        }

        const { done, value } = await reader.read();
        if (done) break;

        lastEventAt = Date.now();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);

          try {
            const parsed: ProgressEvent = JSON.parse(data);
            if (parsed.type === "progress") {
              setProgress(parsed.progress);
              setStage(parsed.stage);

              if (parsed.status === "done") {
                terminalEventRef.current = true;
                router.push(`/dashboard/concurso/${docId}`);
                return;
              }

              if (parsed.status === "failed") {
                terminalEventRef.current = true;
                setFailed(true);
                setError(parsed.error_msg || "Falha no processamento do PDF");
                setUploading(false);
                return;
              }
            }
          } catch {
            // ignora eventos SSE malformados
          }
        }
      }

      // Stream fechou sem evento terminal (done/failed) — erro de conexão
      if (!terminalEventRef.current) {
        if (progress > 0) {
          setError("A conexão com o servidor foi interrompida durante o processamento. O upload pode ter sido concluído — verifique na biblioteca.");
        } else {
          setError("Conexão com o servidor encerrada inesperadamente. Tente novamente.");
        }
        setUploading(false);
      }
    } catch {
      setError("Erro de conexão com o servidor");
      setUploading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);
    setStage("queued");
    setFailed(false);

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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const res = await fetch(`${API_URL}/api/documents/upload`, {
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
        setUploading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Erro ao fazer upload");
        setUploading(false);
        return;
      }

      const data: UploadResponse = await res.json();

      if (res.status === 200 || data.cached) {
        router.push(`/dashboard/concurso/${data.id}`);
        return;
      }

      if (res.status === 202 && data.job_id) {
        await trackProgress(data.job_id, data.id, session.access_token);
        return;
      }

      setError("Resposta inesperada do servidor");
      setUploading(false);
    } catch {
      setError("Erro de conexão com o servidor");
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
          disabled={uploading}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
        >
          <option value="edital">Edital de concurso</option>
          <option value="pdf_generico">PDF de conteúdo</option>
        </select>
      </div>

      <div key={formKey}>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Arquivo PDF
        </label>
        <div className="mt-1 flex justify-center rounded-lg border border-dashed border-slate-300 px-6 py-10">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="mt-4 flex text-sm leading-6 text-slate-600">
              <label className={`relative cursor-pointer rounded-md font-semibold ${uploading ? "text-slate-400" : "text-teal-600 hover:text-teal-500"}`}>
                <span>Selecionar arquivo</span>
                <input
                  type="file"
                  accept=".pdf"
                  disabled={uploading}
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

      {uploading && !failed && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>{STAGE_LABELS[stage] || stage || "Processando..."}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-teal-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {uploading && failed && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-red-600">
            <span>Falha no processamento</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-red-100">
            <div
              className="h-2 rounded-full bg-red-500 transition-all duration-500"
              style={{ width: `${Math.max(progress, 10)}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <svg className="h-5 w-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={!file || uploading}
        className="w-full rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors font-medium"
      >
        {uploading ? "Processando..." : error ? "Tentar novamente" : "Enviar e analisar"}
      </button>
    </form>
  );
}
