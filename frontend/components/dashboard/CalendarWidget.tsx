"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CronogramaPorTopicos, DaySchedule, TopicBlock } from "@/types/documents";
import DayView from "./DayView";
import EditTopicModal from "./EditTopicModal";

interface CalendarWidgetProps {
  cronograma: CronogramaPorTopicos;
  accessToken: string;
  onUpdate: (cronograma: CronogramaPorTopicos) => void;
}

const DIAS_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CalendarWidget({ cronograma, accessToken, onUpdate }: CalendarWidgetProps) {
  const [semanaAtual, setSemanaAtual] = useState(0);
  const [diaSelecionado, setDiaSelecionado] = useState<DaySchedule | null>(null);
  const [blocoEditando, setBlocoEditando] = useState<TopicBlock | null>(null);
  const [loading, setLoading] = useState(false);
  const dayViewRef = useRef<HTMLDivElement>(null);

  const semanas = cronograma.semanas || [];
  const semana = semanas[semanaAtual] || [];

  // Scroll suave para o DayView quando um dia é selecionado
  useEffect(() => {
    if (diaSelecionado && dayViewRef.current) {
      dayViewRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [diaSelecionado]);

  const handleSemanaAnterior = () => {
    setDiaSelecionado(null);
    setSemanaAtual((prev) => Math.max(0, prev - 1));
  };
  const handleSemanaProxima = () => {
    setDiaSelecionado(null);
    setSemanaAtual((prev) => Math.min(semanas.length - 1, prev + 1));
  };

  const atualizarBloco = async (
    bloco: TopicBlock,
    changes: { status?: string; duracao_min?: number; novaData?: string }
  ) => {
    if (!bloco.id) {
      alert("Não foi possível identificar o bloco para atualização.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/cronograma/topico/${bloco.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(changes),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Erro ao atualizar bloco");
        return;
      }

      const novoCronograma = await res.json();
      onUpdate(novoCronograma);
    } finally {
      setLoading(false);
    }
  };

  const handleConcluir = (bloco: TopicBlock) => {
    atualizarBloco(bloco, { status: "concluido" });
  };

  const handlePular = (bloco: TopicBlock) => {
    atualizarBloco(bloco, { status: "pulado" });
  };

  const handleEditar = (bloco: TopicBlock) => {
    setBlocoEditando(bloco);
  };

  const handleSalvarEdicao = (
    changes: { duracao_min?: number; novaData?: string; status?: string }
  ) => {
    if (!blocoEditando) return;
    if (changes.status === "removido") {
      // "Já sei" / remover: backend ainda não suporta delete de bloco.
      alert("Remoção de tópico será implementada em endpoint futuro.");
      setBlocoEditando(null);
      return;
    }
    atualizarBloco(blocoEditando, changes);
    setBlocoEditando(null);
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1E293B]">Cronograma</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSemanaAnterior}
            disabled={semanaAtual === 0}
            className="rounded-lg border border-[#E2E8F0] p-1.5 text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-[#1E293B] min-w-[100px] text-center">
            Semana {semanaAtual + 1} de {semanas.length}
          </span>
          <button
            onClick={handleSemanaProxima}
            disabled={semanaAtual >= semanas.length - 1}
            className="rounded-lg border border-[#E2E8F0] p-1.5 text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Grade semanal */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {semana.map((dia) => {
          const date = new Date(dia.date + "T12:00:00");
          const diaLabel = DIAS_LABEL[date.getDay()];
          const dataLabel = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          const temConcluido = dia.blocos.some((b) => b.status === "concluido");
          const temPulado = dia.blocos.some((b) => b.status === "pulado");

          return (
            <button
              key={dia.date}
              onClick={() => setDiaSelecionado(dia)}
              className={`rounded-lg border p-3 text-left transition-colors hover:bg-[#F8FAFC] ${
                diaSelecionado?.date === dia.date
                  ? "border-teal-600 ring-1 ring-teal-600"
                  : "border-[#E2E8F0]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#64748B]">{diaLabel}</span>
                <span className="text-xs text-[#94A3B8]">{dataLabel}</span>
              </div>
              <div className="space-y-1.5">
                {dia.blocos.slice(0, 3).map((b, idx) => (
                  <div
                    key={idx}
                    className={`text-xs truncate rounded px-1.5 py-0.5 ${
                      b.status === "concluido"
                        ? "bg-emerald-50 text-emerald-700 line-through"
                        : b.status === "pulado"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-[#F1F5F9] text-[#334155]"
                    }`}
                  >
                    {b.disciplina.length > 12 ? b.disciplina.slice(0, 12) + "..." : b.disciplina}
                  </div>
                ))}
                {dia.blocos.length > 3 && (
                  <p className="text-[10px] text-[#94A3B8]">+{dia.blocos.length - 3} tópicos</p>
                )}
                {dia.blocos.length === 0 && (
                  <p className="text-[10px] text-[#94A3B8]">Sem estudo</p>
                )}
              </div>
              {(temConcluido || temPulado) && (
                <div className="mt-2 flex gap-1">
                  {temConcluido && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                  {temPulado && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Concluído</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pulado</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#334155]" /> Pendente</span>
      </div>

      {loading && <p className="mt-4 text-sm text-[#64748B]">Atualizando...</p>}

      {!diaSelecionado && !loading && (
        <p className="mt-4 text-xs text-center text-[#94A3B8]">
          Selecione um dia para ver os detalhes dos tópicos
        </p>
      )}

      {/* Visão do dia */}
      {diaSelecionado && (
        <div ref={dayViewRef} className="mt-6">
          <DayView
            day={diaSelecionado}
            onConcluir={(topico) => {
              const bloco = diaSelecionado.blocos.find((b) => b.topico === topico);
              if (bloco) handleConcluir(bloco);
            }}
            onPular={(topico) => {
              const bloco = diaSelecionado.blocos.find((b) => b.topico === topico);
              if (bloco) handlePular(bloco);
            }}
            onEditar={(topico) => {
              const bloco = diaSelecionado.blocos.find((b) => b.topico === topico);
              if (bloco) handleEditar(bloco);
            }}
          />
        </div>
      )}

      {/* Modal de edição */}
      {blocoEditando && diaSelecionado && (
        <EditTopicModal
          bloco={blocoEditando}
          onClose={() => setBlocoEditando(null)}
          onSalvar={(changes) => handleSalvarEdicao(changes)}
        />
      )}
    </div>
  );
}
