"use client";

import { useState } from "react";
import type { TopicBlock } from "@/types/documents";

interface EditTopicModalProps {
  bloco: TopicBlock;
  onClose: () => void;
  onSalvar: (changes: {
    duracao_min?: number;
    novaData?: string;
    status?: "pendente" | "concluido" | "pulado" | "removido";
  }) => void;
}

export default function EditTopicModal({ bloco, onClose, onSalvar }: EditTopicModalProps) {
  const [duracao, setDuracao] = useState(bloco.duracao_min);
  const [novaData, setNovaData] = useState("");
  const [acao, setAcao] = useState<"editar" | "ja_sei" | "remover">("editar");

  const handleSalvar = () => {
    if (acao === "ja_sei") {
      onSalvar({ status: "removido" });
    } else if (acao === "remover") {
      onSalvar({ status: "removido" });
    } else {
      const changes: { duracao_min?: number; novaData?: string } = {};
      if (duracao !== bloco.duracao_min) changes.duracao_min = duracao;
      if (novaData) changes.novaData = novaData;
      onSalvar(changes);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1E293B]">Editar tópico</h3>
        <p className="mt-1 text-sm text-[#64748B]">
          {bloco.disciplina} · {bloco.topico}
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1E293B]">Duração (minutos)</label>
            <input
              type="number"
              min={15}
              max={300}
              value={duracao}
              onChange={(e) => setDuracao(Number(e.target.value))}
              disabled={acao !== "editar"}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:border-teal-600 focus:outline-none disabled:bg-[#F8FAFC]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B]">Mover para outro dia</label>
            <input
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              disabled={acao !== "editar"}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:border-teal-600 focus:outline-none disabled:bg-[#F8FAFC]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#1E293B]">Ações rápidas</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAcao("editar")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  acao === "editar"
                    ? "border-teal-600 bg-teal-50 text-teal-700"
                    : "border-[#E2E8F0] bg-white text-[#64748B]"
                }`}
              >
                ✏️ Alterar
              </button>
              <button
                type="button"
                onClick={() => setAcao("ja_sei")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  acao === "ja_sei"
                    ? "border-teal-600 bg-teal-50 text-teal-700"
                    : "border-[#E2E8F0] bg-white text-[#64748B]"
                }`}
              >
                ⏭️ Já sei
              </button>
              <button
                type="button"
                onClick={() => setAcao("remover")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  acao === "remover"
                    ? "border-red-600 bg-red-50 text-red-700"
                    : "border-[#E2E8F0] bg-white text-[#64748B]"
                }`}
              >
                🗑️ Remover
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
