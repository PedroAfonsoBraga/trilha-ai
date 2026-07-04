"use client";

import { useState } from "react";

interface DocItem {
  id: string;
  nome_original: string;
  tipo: string;
  created_at: string;
  processado: boolean;
}

interface Props {
  documentos: DocItem[];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _accessToken: string;
  uploadForm: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _basePath?: string;
  emptyMessage?: string;
}

function tipoLabel(tipo: string): string {
  switch (tipo) {
    case "edital": return "Edital";
    case "pdf_generico": return "PDF de conteúdo";
    default: return tipo;
  }
}

function tipoBadgeClass(tipo: string): string {
  switch (tipo) {
    case "edital": return "bg-blue-100 text-blue-700";
    case "pdf_generico": return "bg-amber-100 text-amber-700";
    default: return "bg-slate-100 text-slate-700";
  }
}

function docLink(_tipo: string, id: string): string {
  return `/dashboard/concurso/${id}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

export function DocumentList({
  documentos,
  _accessToken,
  uploadForm,
  _basePath,
  emptyMessage = "Nenhum documento encontrado.",
}: Props) {
  const [showUpload, setShowUpload] = useState(false);

  // Se não tem documentos, mostra upload direto com mensagem
  if (documentos.length === 0) {
    return (
      <div>
        <p className="text-sm text-slate-500 mb-4">
          {emptyMessage}
        </p>
        <div className="rounded-xl bg-white p-8 shadow-sm">
          {uploadForm}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Documentos existentes */}
      <div className="grid gap-4 sm:grid-cols-2">
        {documentos.map((doc) => (
          <a
            key={doc.id}
            href={docLink(doc.tipo, doc.id)}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-2 mb-2">
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tipoBadgeClass(doc.tipo)}`}>
                {tipoLabel(doc.tipo)}
              </span>
              {doc.processado && (
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                  Processado
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {doc.nome_original}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {formatDate(doc.created_at)}
            </p>
          </a>
        ))}
      </div>

      {/* Novo upload */}
      {!showUpload ? (
        <div className="text-center">
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-lg border-2 border-dashed border-slate-300 px-8 py-4 text-sm font-medium text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors w-full"
          >
            + Fazer upload de novo documento
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-white p-8 shadow-sm border border-teal-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-700">Novo upload</h3>
            <button
              onClick={() => setShowUpload(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
          </div>
          {uploadForm}
        </div>
      )}
    </div>
  );
}
