import type { DashboardAtividadeItem } from "@/types/documents";

interface AtividadeRecenteListProps {
  atividades: DashboardAtividadeItem[] | null;
}

export default function AtividadeRecenteList({ atividades }: AtividadeRecenteListProps) {
  if (!atividades || atividades.length === 0) {
    return (
      <div>
        <p className="label mb-3">ATIVIDADE RECENTE</p>
        <p className="text-[13px] text-[#94A3B8] font-satoshi">
          Nenhuma atividade recente
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="label mb-3">ATIVIDADE RECENTE</p>
      <div className="space-y-3">
        {atividades.map((item, index) => (
          <div key={index} className="flex items-start gap-2.5">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#64748B] font-satoshi">{item.descricao}</p>
              <p className="text-[11px] font-mono font-medium text-[#94A3B8]">
                {item.data_relativa}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
