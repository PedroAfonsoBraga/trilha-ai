import type { DashboardCronogramaHoje } from "@/types/documents";

interface SessoesHojeListProps {
  cronogramaHoje: DashboardCronogramaHoje | null;
}

const statusBadge: Record<string, { label: string; color: string }> = {
  em_dia: { label: "Em dia", color: "bg-[#DCFCE7] text-[#059669]" },
  atrasado: { label: "Atrasado", color: "bg-[#FEF3C7] text-[#D97706]" },
  critico: { label: "Crítico", color: "bg-[#FEE2E2] text-[#DC2626]" },
  a_iniciar: { label: "Pendente", color: "bg-[#F1F5F9] text-[#64748B]" },
};

export default function SessoesHojeList({ cronogramaHoje }: SessoesHojeListProps) {
  const items = cronogramaHoje?.items || null;
  const mensagem = cronogramaHoje?.mensagem || null;

  if (!items || items.length === 0) {
    return (
      <div>
        <p className="label mb-3">HOJE</p>
        {mensagem ? (
          <p className="text-[13px] text-[#64748B] font-satoshi">{mensagem}</p>
        ) : (
          <p className="text-[13px] text-[#94A3B8] font-satoshi">
            Nenhuma sessão planejada
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="label mb-3">HOJE</p>
      <div className="space-y-2">
        {items.slice(0, 4).map((item, index) => {
          const badge = statusBadge[item.status] || statusBadge.a_iniciar;
          return (
            <div
              key={`${item.disciplina}-${index}`}
              className="rounded-lg border-l-3 bg-[#F8FAFC] p-3"
              style={{ borderLeftWidth: 3, borderLeftColor: item.dot_color }}
            >
              <p className="text-[13px] font-mono font-semibold text-[#64748B]">
                {item.horas_sugeridas}h
              </p>
              <p className="text-[14px] font-semibold text-[#1E293B] font-satoshi mt-0.5">
                {item.disciplina}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[13px] text-[#64748B] font-satoshi">
                  {item.horas_sugeridas} horas
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {items.length > 4 && (
        <a
          href="/dashboard/concurso"
          className="mt-2 inline-block text-[13px] font-medium text-teal-600 hover:text-teal-700 transition-colors"
        >
          Ver cronograma completo →
        </a>
      )}
    </div>
  );
}
