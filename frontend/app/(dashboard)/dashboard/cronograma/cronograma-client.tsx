"use client";

import { useState } from "react";
import SetupWizard from "@/components/dashboard/SetupWizard";
import CalendarWidget from "@/components/dashboard/CalendarWidget";
import type { CronogramaPorTopicos, Document } from "@/types/documents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CronogramaClientProps {
  editais: Document[];
  editalInicial: string | null;
  cronogramaInicial: CronogramaPorTopicos | null;
  cronogramaErro: string | null;
  accessToken: string;
  plano: string;
}

export default function CronogramaClient({
  editais,
  editalInicial,
  cronogramaInicial,
  cronogramaErro,
  accessToken,
  plano,
}: CronogramaClientProps) {
  const [editalSelecionado, setEditalSelecionado] = useState<string | null>(editalInicial);
  const [cronograma, setCronograma] = useState<CronogramaPorTopicos | null>(cronogramaInicial);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataProvaManual, setDataProvaManual] = useState("");
  const [confirmouData, setConfirmouData] = useState(false);

  const editalAtual = editais.find((e) => e.id === editalSelecionado);

  const disciplinas = editalAtual?.metadata?.parsed?.disciplinas || [];
  const dataProvaDetectada =
    editalAtual?.metadata?.parsed?.datas_importantes?.find((d) =>
      /prova|avaliação|aplicação|concurso/i.test(d.evento)
    )?.data ||
    editalAtual?.metadata?.parsed?.datas_importantes?.[0]?.data ||
    "";
  const dataProva = dataProvaManual || dataProvaDetectada;

  const carregarCronograma = async (editalId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/cronograma/${editalId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setCronograma(data);
      } else {
        setCronograma(null);
      }
    } catch {
      setCronograma(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarEdital = (id: string) => {
    setEditalSelecionado(id);
    setCronograma(null);
    setDataProvaManual("");
    setConfirmouData(false);
    setShowWizard(false);
    carregarCronograma(id);
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    if (editalSelecionado) {
      carregarCronograma(editalSelecionado);
    }
  };

  if (editais.length === 0) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-[#1E293B]">Cronograma</h1>
        <p className="mt-2 text-[#64748B]">Você ainda não tem editais cadastrados.</p>
        <a
          href="/dashboard/concurso"
          className="mt-4 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Subir edital
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1E293B]">Cronograma</h1>
          <p className="text-sm text-[#64748B]">Visualize e ajuste seu plano de estudos por tópico.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={editalSelecionado || ""}
            onChange={(e) => handleSelecionarEdital(e.target.value)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-teal-600 focus:outline-none"
          >
            {editais.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome_original}
              </option>
            ))}
          </select>

          {editalSelecionado && !showWizard && (
            <button
              onClick={() => setShowWizard(true)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              {cronograma ? "Regenerar" : "Gerar cronograma"}
            </button>
          )}
        </div>
      </div>

      {cronogramaErro && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Erro ao carregar cronograma: {cronogramaErro}
        </div>
      )}

      {loading && <p className="text-sm text-[#64748B]">Carregando cronograma...</p>}

      {showWizard && editalAtual && (
        <>
          {!dataProva || !confirmouData ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 max-w-md mx-auto">
              <h2 className="text-lg font-semibold text-[#1E293B]">
                {dataProvaDetectada ? "Confirme a data da prova" : "Data da prova não encontrada"}
              </h2>
              <p className="text-sm text-[#64748B] mt-1">
                {dataProvaDetectada
                  ? "Verifique se a data detectada no edital está correta."
                  : "Não identificamos a data da prova no edital. Informe manualmente para gerar o cronograma."}
              </p>
              <input
                type="date"
                value={dataProvaManual || dataProvaDetectada}
                onChange={(e) => setDataProvaManual(e.target.value)}
                className="mt-4 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowWizard(false)}
                  className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!dataProva) {
                      alert("Informe a data da prova");
                      return;
                    }
                    setConfirmouData(true);
                  }}
                  disabled={!dataProva}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            </div>
          ) : (
            <SetupWizard
              editalId={editalAtual.id}
              disciplinas={disciplinas}
              dataProva={dataProva}
              accessToken={accessToken}
              plano={plano as "free" | "estudante" | "pro"}
              onComplete={handleWizardComplete}
              onCancel={() => setShowWizard(false)}
            />
          )}
        </>
      )}

      {!showWizard && cronograma && (
        <CalendarWidget
          cronograma={cronograma}
          accessToken={accessToken}
          onUpdate={(novo) => setCronograma(novo)}
        />
      )}

      {!showWizard && !cronograma && !loading && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center">
          <p className="text-[#64748B]">Nenhum cronograma encontrado para este edital.</p>
          <button
            onClick={() => setShowWizard(true)}
            className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Criar cronograma
          </button>
        </div>
      )}
    </div>
  );
}
