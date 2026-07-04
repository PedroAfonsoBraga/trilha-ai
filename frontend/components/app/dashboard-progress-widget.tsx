"use client";

import { DashboardProgressoGeral } from "@/types/documents";

interface ProgressWidgetProps {
  progressoGeral: DashboardProgressoGeral | null;
}

export default function DashboardProgressWidget({
  progressoGeral,
}: ProgressWidgetProps) {
  if (!progressoGeral) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Progresso Geral
        </h2>
        <p className="mt-2 text-sm text-slate-500">Indisponível no momento.</p>
      </div>
    );
  }

  const {
    total_itens,
    itens_completados,
    taxa_conclusao,
    horas_estudadas,
    total_documentos,
    total_disciplinas,
  } = progressoGeral;

  // Estado vazio — sem itens de progresso
  if (total_itens === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Progresso Geral
        </h2>
        <div className="mt-4 text-center">
          <p className="text-4xl">📚</p>
          <p className="mt-2 text-sm font-medium text-slate-700">
            Comece a estudar!
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Faça upload de um edital e comece a marcar seu progresso.
          </p>
          <a
            href="/dashboard/concurso"
            className="mt-3 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Upload de Edital
          </a>
        </div>
      </div>
    );
  }

  // Estado completo — 100%
  const isComplete = taxa_conclusao >= 100;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Progresso Geral
        </h2>
        {isComplete && <span className="text-2xl">🎉</span>}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            {isComplete ? "Tudo concluído!" : `${taxa_conclusao}% concluído`}
          </span>
          <span className="text-slate-500">
            {itens_completados}/{total_itens} itens
          </span>
        </div>

        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isComplete
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-teal-400 to-teal-600"
            }`}
            style={{ width: `${Math.min(taxa_conclusao, 100)}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span>{horas_estudadas}h estudadas</span>
          <span>{total_documentos} documento{total_documentos !== 1 ? "s" : ""}</span>
          <span>{total_disciplinas} disciplina{total_disciplinas !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
