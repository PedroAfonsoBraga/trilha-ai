"use client";

import type { DashboardData } from "@/types/documents";
import ProvaCountdown from "./ProvaCountdown";
import SessoesHojeList from "./SessoesHojeList";
import ChatProWidget from "./ChatProWidget";
import AtividadeRecenteList from "./AtividadeRecenteList";

interface RightPanelProps {
  data: DashboardData | null;
  plano: string;
}

export default function RightPanel({ data, plano }: RightPanelProps) {
  const edital = data?.edital_ativo;
  const cronogramaHoje = data?.cronograma_hoje || null;
  const atividades = data?.atividade_recente || null;

  return (
    <aside
      aria-label="Informações da prova"
      className="hidden w-[320px] shrink-0 overflow-y-auto border-l border-[#E2E8F0] bg-white p-6 xl:block"
    >
      <div className="space-y-6">
        {/* Bloco 1: Countdown */}
        <ProvaCountdown
          diasRestantes={edital?.dias_restantes ?? null}
          dataProva={edital?.data_prova ?? null}
        />

        <hr className="border-[#E2E8F0]" />

        {/* Bloco 2: Sessões de hoje */}
        <SessoesHojeList cronogramaHoje={cronogramaHoje} />

        <hr className="border-[#E2E8F0]" />

        {/* Bloco 3: Chat Pro */}
        <ChatProWidget plano={plano} />

        <hr className="border-[#E2E8F0]" />

        {/* Bloco 4: Atividade recente */}
        <AtividadeRecenteList atividades={atividades} />
      </div>
    </aside>
  );
}
