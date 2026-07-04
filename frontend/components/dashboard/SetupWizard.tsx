"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Disciplina, UserConfigCronograma } from "@/types/documents";

type Nivel = "fraco" | "medio" | "forte";

const DIAS_DA_SEMANA = [
  { label: "Seg", value: 1 },
  { label: "Ter", value: 2 },
  { label: "Qua", value: 3 },
  { label: "Qui", value: 4 },
  { label: "Sex", value: 5 },
  { label: "Sáb", value: 6 },
  { label: "Dom", value: 7 },
];

const HORAS_OPCOES = [1, 1.5, 2, 2.5, 3, 4, 5];

interface SetupWizardProps {
  editalId: string;
  disciplinas: Disciplina[];
  dataProva: string;
  accessToken: string;
  plano: "free" | "estudante" | "pro";
  onComplete: () => void;
  onCancel?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SetupWizard({
  editalId,
  disciplinas,
  dataProva,
  accessToken,
  plano,
  onComplete,
  onCancel,
}: SetupWizardProps) {
  const [etapa, setEtapa] = useState(1);
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([1, 2, 3, 4, 5]);
  const [horasPorDia, setHorasPorDia] = useState(2);
  const [reservarRevisao, setReservarRevisao] = useState(true);
  const [niveis, setNiveis] = useState<Record<string, Nivel>>(() => {
    const inicial: Record<string, Nivel> = {};
    disciplinas.forEach((d) => {
      inicial[d.nome] = "medio";
    });
    return inicial;
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const toggleDia = (dia: number) => {
    setDiasSelecionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const handleNivel = (disciplina: string, nivel: Nivel) => {
    setNiveis((prev) => ({ ...prev, [disciplina]: nivel }));
  };

  const totalTopicos = disciplinas.reduce((acc, d) => acc + (d.topicos?.length || 0), 0);

  const calcularSemanas = () => {
    const hoje = new Date();
    const prova = new Date(dataProva);
    const diffMs = prova.getTime() - hoje.getTime();
    const diffDias = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return Math.ceil(diffDias / 7);
  };

  const avancar = () => {
    if (etapa === 1 && diasSelecionados.length === 0) {
      setErro("Selecione ao menos 1 dia de estudo");
      return;
    }
    setErro(null);
    setEtapa((prev) => prev + 1);
  };

  const voltar = () => setEtapa((prev) => prev - 1);

  const gerar = async () => {
    setLoading(true);
    setErro(null);

    const userConfig: UserConfigCronograma = {
      dias_da_semana: diasSelecionados,
      horas_por_dia: horasPorDia,
      nivel_por_disciplina: niveis,
      reservar_revisao: plano === "pro" ? reservarRevisao : false,
      data_prova: dataProva,
    };

    try {
      const res = await fetch(`${API_URL}/api/cronograma/gerar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ edital_id: editalId, user_config: userConfig }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Erro ao gerar cronograma");
      }

      onComplete();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar cronograma");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 max-w-2xl mx-auto">
      {/* Progresso */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-2 flex-1 rounded-full transition-colors ${
              n <= etapa ? "bg-teal-600" : "bg-[#E2E8F0]"
            }`}
          />
        ))}
      </div>

      {erro && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {etapa === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1E293B]">Quanto tempo você tem para estudar?</h2>
            <p className="text-[#64748B] text-sm mt-1">Selecione seus dias e horas diárias.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-3">Dias da semana</label>
            <div className="flex flex-wrap gap-2">
              {DIAS_DA_SEMANA.map((dia) => {
                const selecionado = diasSelecionados.includes(dia.value);
                return (
                  <button
                    key={dia.value}
                    type="button"
                    onClick={() => toggleDia(dia.value)}
                    className={`h-10 w-12 rounded-lg border text-sm font-medium transition-colors ${
                      selecionado
                        ? "border-teal-600 bg-teal-600 text-white"
                        : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {dia.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-3">
              Horas por dia: <span className="text-teal-600 font-semibold">{horasPorDia}h</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {HORAS_OPCOES.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorasPorDia(h)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    horasPorDia === h
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] p-4">
            <div>
              <p className="text-sm font-medium text-[#1E293B]">Reservar última semana para revisão</p>
              <p className="text-xs text-[#64748B]">{plano === "pro" ? "Disponível no plano Pro" : "Apenas para plano Pro"}</p>
            </div>
            <button
              type="button"
              disabled={plano !== "pro"}
              onClick={() => setReservarRevisao((prev) => !prev)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                reservarRevisao && plano === "pro" ? "bg-teal-600" : "bg-[#E2E8F0]"
              } ${plano !== "pro" ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <span
                className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  reservarRevisao && plano === "pro" ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {etapa === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1E293B]">Como você se sente em cada disciplina?</h2>
            <p className="text-[#64748B] text-sm mt-1">Isso ajusta o tempo de estudo automaticamente.</p>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {disciplinas.map((d) => (
              <div
                key={d.nome}
                className="flex items-center justify-between rounded-lg border border-[#E2E8F0] p-4"
              >
                <span className="text-sm font-medium text-[#1E293B] truncate max-w-[50%]">{d.nome}</span>
                <div className="flex gap-2">
                  {(["fraco", "medio", "forte"] as Nivel[]).map((nivel) => (
                    <button
                      key={nivel}
                      type="button"
                      onClick={() => handleNivel(d.nome, nivel)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                        niveis[d.nome] === nivel
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {nivel === "fraco" && "😓 Fraco"}
                      {nivel === "medio" && "😐 Médio"}
                      {nivel === "forte" && "💪 Forte"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {etapa === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1E293B]">Seu plano de estudos</h2>
            <p className="text-[#64748B] text-sm mt-1">Revise o resumo antes de gerar.</p>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Duração</span>
              <span className="font-medium text-[#1E293B]">{calcularSemanas()} semanas</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Rotina</span>
              <span className="font-medium text-[#1E293B]">
                {horasPorDia}h/dia · {diasSelecionados.sort().map((d) => DIAS_DA_SEMANA[d - 1].label).join(", ")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Conteúdo</span>
              <span className="font-medium text-[#1E293B]">
                {disciplinas.length} disciplinas · {totalTopicos} tópicos
              </span>
            </div>
            {reservarRevisao && plano === "pro" && (
              <div className="flex justify-between text-sm">
                <span className="text-[#64748B]">Revisão</span>
                <span className="font-medium text-[#1E293B]">Última semana reservada</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        {etapa > 1 ? (
          <Button variant="outline" onClick={voltar} disabled={loading}>
            Voltar
          </Button>
        ) : (
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}

        {etapa < 3 ? (
          <Button onClick={avancar} className="bg-teal-600 hover:bg-teal-700">
            Avançar
          </Button>
        ) : (
          <Button
            onClick={gerar}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? "Gerando..." : "Gerar meu cronograma →"}
          </Button>
        )}
      </div>
    </div>
  );
}
