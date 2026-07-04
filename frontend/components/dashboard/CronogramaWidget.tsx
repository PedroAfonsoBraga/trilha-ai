import type { DashboardCronogramaHoje } from "@/types/documents";
import DisciplinaRow from "./DisciplinaRow";

interface CronogramaWidgetProps {
  cronograma: DashboardCronogramaHoje | null;
}

export default function CronogramaWidget({ cronograma }: CronogramaWidgetProps) {
  const items = cronograma?.items || [];

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-[18px] font-semibold text-[#1E293B]">
            Hoje no cronograma
          </h3>
          {cronograma?.dia && (
            <p className="mt-0.5 text-[13px] text-[#64748B] font-satoshi">{cronograma.dia}</p>
          )}
        </div>
        <a
          href="/dashboard/cronograma"
          className="text-[13px] font-medium text-teal-600 hover:text-teal-700 transition-colors"
        >
          Ver cronograma completo →
        </a>
      </div>

      {/* Lista de disciplinas */}
      {items.length === 0 ? (
        <div className="py-8 text-center">
          {cronograma?.mensagem ? (
            <>
              <p className="text-[15px] text-[#64748B]">{cronograma.mensagem}</p>
              {cronograma.mensagem.includes("dias configurados") && (
                <p className="mt-1 text-[13px] text-[#94A3B8]">
                  Seus blocos serão exibidos aqui nos dias de estudo definidos.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-[15px] text-[#64748B]">Nenhuma sessão planejada para hoje.</p>
              <p className="mt-1 text-[13px] text-[#94A3B8]">
                Faça upload de um edital e gere um cronograma para começar.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <DisciplinaRow
              key={`${item.disciplina}-${index}`}
              disciplina={item.topico ? `${item.disciplina}: ${item.topico}` : item.disciplina}
              horas={item.horas_sugeridas}
              progressoPct={item.progresso_pct}
              status={item.status}
              dotColor={item.dot_color}
              banca={item.banca}
            />
          ))}
        </div>
      )}
    </div>
  );
}
