"use client";

import type { DaySchedule } from "@/types/documents";
import TopicBlock from "./TopicBlock";

interface DayViewProps {
  day: DaySchedule;
  onConcluir: (topico: string) => void;
  onPular: (topico: string) => void;
  onEditar: (topico: string) => void;
}

export default function DayView({ day, onConcluir, onPular, onEditar }: DayViewProps) {
  const date = new Date(day.date + "T12:00:00");
  const diaSemana = date.toLocaleDateString("pt-BR", { weekday: "long" });
  const dataFormatada = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });

  const totalHoras = Math.floor(day.total_minutos / 60);
  const totalMinutos = day.total_minutos % 60;

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#1E293B] capitalize">{diaSemana}, {dataFormatada}</h3>
        <p className="text-sm text-[#64748B]">
          {day.blocos.length} {day.blocos.length === 1 ? "tópico" : "tópicos"} ·{" "}
          {totalHoras}h{totalMinutos > 0 ? `${totalMinutos}min` : ""} de estudo
        </p>
      </div>

      {day.blocos.length === 0 ? (
        <p className="text-sm text-[#94A3B8]">Nenhum tópico agendado para este dia.</p>
      ) : (
        <div className="space-y-3">
          {day.blocos.map((bloco, idx) => (
            <TopicBlock
              key={`${bloco.disciplina}-${bloco.topico}-${idx}`}
              bloco={bloco}
              onConcluir={() => onConcluir(bloco.topico)}
              onPular={() => onPular(bloco.topico)}
              onEditar={() => onEditar(bloco.topico)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
