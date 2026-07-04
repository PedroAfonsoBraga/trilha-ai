import type { DashboardDisciplinaRisco } from "@/types/documents";
import { AlertTriangle } from "lucide-react";

interface DisciplinaAlertaListProps {
  disciplinas: DashboardDisciplinaRisco[] | null;
}

export default function DisciplinaAlertaList({ disciplinas }: DisciplinaAlertaListProps) {
  if (!disciplinas || disciplinas.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-[#F59E0B]" />
        <h3 className="font-heading text-[18px] font-semibold text-[#1E293B]">
          Atenção necessária
        </h3>
      </div>

      <div className="space-y-3">
        {disciplinas.slice(0, 3).map((item, index) => {
          const isCritico = item.nivel === "critico";
          return (
            <div
              key={`${item.disciplina}-${index}`}
              className={`rounded-lg border-l-3 p-3.5 ${
                isCritico
                  ? "bg-[#FEF2F2] border-l-[#EF4444]"
                  : "bg-[#FFFBEB] border-l-[#F59E0B]"
              }`}
              role="alert"
              aria-live="polite"
              style={{ borderLeftWidth: 3 }}
            >
              <p className="text-[14px] font-semibold text-[#1E293B] font-satoshi">
                {item.disciplina}
              </p>
              <p className="mt-0.5 text-[13px] text-[#64748B] font-satoshi">
                {item.mensagem}
              </p>
              <a
                href="/dashboard/concurso"
                className="mt-1.5 inline-block text-[13px] font-medium text-teal-600 hover:text-teal-700 transition-colors"
              >
                Reorganizar →
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
