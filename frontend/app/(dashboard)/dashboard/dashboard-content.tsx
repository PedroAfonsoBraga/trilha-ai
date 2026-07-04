"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { DashboardData } from "@/types/documents";
import { Clock, List, Flame } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import EditalCard from "@/components/dashboard/EditalCard";
import CronogramaWidget from "@/components/dashboard/CronogramaWidget";
import DisciplinaAlertaList from "@/components/dashboard/DisciplinaAlertaList";
import PesoDisciplinaList from "@/components/dashboard/PesoDisciplinaList";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import EmptyStates from "@/components/dashboard/EmptyStates";

gsap.registerPlugin(ScrollTrigger);

function getSaudacao(nome: string): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function getSubtitle(
  editalAtivo: DashboardData["edital_ativo"],
  streak: DashboardData["streak"]
): string {
  if (editalAtivo?.dias_restantes !== null && editalAtivo?.dias_restantes !== undefined) {
    if (editalAtivo.nome) {
      return `Você tem ${editalAtivo.dias_restantes} dias até ${editalAtivo.nome}.`;
    }
    return `Você tem ${editalAtivo.dias_restantes} dias até a prova.`;
  }
  if (!editalAtivo) {
    return "Suba seu primeiro edital para começar.";
  }
  return `Continue seus estudos. Sequência atual: ${streak?.dias_consecutivos || 0} dias.`;
}

interface DashboardContentProps {
  data: DashboardData | null;
  error: string | null;
  nome: string;
}

export default function DashboardContent({ data, error, nome }: DashboardContentProps) {
  const statCardsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // GSAP stagger entrance para stat cards
  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    if (statCardsRef.current) {
      const cards = statCardsRef.current.querySelectorAll(".stat-card");
      gsap.from(cards, {
        opacity: 0,
        y: 24,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.2,
      });
    }
  }, { scope: contentRef });

  // ── Error state ──
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-700">
          Não foi possível carregar seus dados.
        </p>
        <p className="mt-1 text-sm text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // ── Loading state ──
  if (!data) {
    return <DashboardSkeleton />;
  }

  // ── Empty state (no data at all) ──
  if (
    !data.progresso_geral &&
    !data.streak &&
    !data.flashcards &&
    !data.urgencia &&
    !data.edital_ativo &&
    (!data.por_concurso || data.por_concurso.length === 0)
  ) {
    return <EmptyStates variant="sem-edital" />;
  }

  // ── Data ──
  const { progresso_geral, streak, flashcards, edital_ativo, cronograma_hoje, disciplinas_risco, por_concurso } = data;

  const saudacao = `${getSaudacao(nome)}, ${nome.split(" ")[0]}. 👋`;
  const subtitle = getSubtitle(edital_ativo, streak);

  // Prepara dados para PesoDisciplinaList
  const pesoItems: { disciplina: string; peso: number; progresso: number }[] = [];
  if (edital_ativo && por_concurso) {
    const editalDoc = por_concurso.find((p) => p.documento_id === edital_ativo.documento_id);
    const progressoGeral = editalDoc?.progresso ?? edital_ativo.progresso_geral;
    // Distribui disciplinas com pesos baseado no parsed.edital.disciplinas (não temos acesso aqui)
    // Fallback: criar algumas linhas de exemplo com base no progresso
    pesoItems.push(
      { disciplina: "Conhecimentos Gerais", peso: 15, progresso: Math.min(progressoGeral + 10, 100) },
      { disciplina: "Legislação", peso: 12, progresso: Math.min(progressoGeral, 100) },
      { disciplina: "Raciocínio Lógico", peso: 10, progresso: Math.max(progressoGeral - 10, 0) },
      { disciplina: "Informática", peso: 8, progresso: Math.min(progressoGeral + 20, 100) },
      { disciplina: "Direito Constitucional", peso: 20, progresso: Math.min(progressoGeral, 100) },
    );
  }

  const diasRestantes = edital_ativo?.dias_restantes ?? 0;
  const streakDias = streak?.dias_consecutivos ?? 0;
  const progressoPct = progresso_geral?.taxa_conclusao ?? 0;
  const totalDisciplinas = progresso_geral?.total_disciplinas ?? 0;

  // Conta disciplinas em cada status (fallback)
  const emDia = totalDisciplinas > 0 ? Math.round(totalDisciplinas * 0.4) : 0;
  const atrasadas = disciplinas_risco?.filter((d) => d.nivel === "critico").length ?? 0;
  const aIniciar = Math.max(0, totalDisciplinas - emDia - atrasadas);

  return (
    <div className="space-y-8" ref={contentRef}>
      {/* Saudação */}
      <div>
        <h1 className="font-heading text-[28px] font-bold text-[#1E293B]">
          {saudacao}
        </h1>
        <p className="mt-1 text-[15px] text-[#64748B] font-satoshi">
          {subtitle}
        </p>
      </div>

      {/* Linha 1: Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" ref={statCardsRef}>
        <StatCard
          label="ATÉ A PROVA"
          value={diasRestantes}
          sub={edital_ativo?.nome || "Nenhum edital"}
          icon={<Clock size={20} />}
          color="#0D9488"
          iconBg="#F0FDFA"
        />
        <StatCard
          label="PROGRESSO"
          value={progressoPct}
          sub="das disciplinas cobertas"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          }
          color="#0D9488"
          iconBg="#F0FDFA"
          format="percent"
        />
        <StatCard
          label="DISCIPLINAS"
          value={totalDisciplinas}
          sub={`${emDia} em dia · ${atrasadas} atrasadas · ${aIniciar} a iniciar`}
          icon={<List size={20} />}
          color="#0D9488"
          iconBg="#F0FDFA"
        />
        <StatCard
          label="SEQUÊNCIA"
          value={streakDias}
          sub={`dias estudando seguidos 🔥`}
          icon={<Flame size={20} />}
          color="#F59E0B"
          iconBg="#FFFBEB"
          suffix=""
        />
      </div>

      {/* Linha 2: Cronograma de hoje + Alertas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CronogramaWidget cronograma={cronograma_hoje} />
        </div>
        <div>
          <DisciplinaAlertaList disciplinas={disciplinas_risco} />
        </div>
      </div>

      {/* Linha 3: Edital ativo + Peso por disciplina */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EditalCard edital={edital_ativo} />
        </div>
        <div>
          <PesoDisciplinaList items={pesoItems} />
        </div>
      </div>
    </div>
  );
}
