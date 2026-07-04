"use client";

import type { TopicBlock as TopicBlockType } from "@/types/documents";

interface TopicBlockProps {
  bloco: TopicBlockType;
  onConcluir: () => void;
  onPular: () => void;
  onEditar: () => void;
}

export default function TopicBlock({ bloco, onConcluir, onPular, onEditar }: TopicBlockProps) {
  const statusStyles = {
    pendente: "border-l-[3px] border-teal-600 bg-[#F8FAFC]",
    concluido: "border-l-[3px] border-emerald-600 bg-emerald-50",
    pulado: "border-l-[3px] border-amber-500 bg-amber-50",
  };

  const statusBadge = {
    pendente: { label: "Pendente", className: "bg-slate-100 text-slate-600" },
    concluido: { label: "Concluído", className: "bg-emerald-100 text-emerald-700" },
    pulado: { label: "Reagendado", className: "bg-amber-100 text-amber-700" },
  };

  const horas = Math.floor(bloco.duracao_min / 60);
  const minutos = bloco.duracao_min % 60;
  const duracaoTexto = horas > 0 ? `${horas}h${minutos > 0 ? `${minutos}min` : ""}` : `${minutos}min`;

  return (
    <div className={`rounded-lg p-3 ${statusStyles[bloco.status]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium text-[#64748B] uppercase tracking-wide truncate ${bloco.status === "concluido" ? "line-through opacity-70" : ""}`}>
            {bloco.disciplina}
          </p>
          <p className={`text-sm font-medium text-[#1E293B] mt-0.5 ${bloco.status === "concluido" ? "line-through opacity-70" : ""}`}>
            {bloco.topico}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold text-[#1E293B]">{duracaoTexto}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusBadge[bloco.status].className}`}>
            {statusBadge[bloco.status].label}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {bloco.status !== "concluido" && (
          <button
            onClick={onConcluir}
            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
          >
            Concluir
          </button>
        )}
        {bloco.status !== "pulado" && bloco.status !== "concluido" && (
          <button
            onClick={onPular}
            className="rounded-md border border-amber-500 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
          >
            Pular
          </button>
        )}
        <button
          onClick={onEditar}
          className="rounded-md border border-[#E2E8F0] px-3 py-1 text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC]"
        >
          Editar
        </button>
      </div>
    </div>
  );
}
