interface PesoItem {
  disciplina: string;
  peso: number;
  progresso: number;
}

interface PesoDisciplinaListProps {
  items: PesoItem[];
}

export default function PesoDisciplinaList({ items }: PesoDisciplinaListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
      <h3 className="font-heading text-[18px] font-semibold text-[#1E293B] mb-4">
        Peso por disciplina
      </h3>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.disciplina}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[14px] font-medium text-[#1E293B] font-satoshi">
                {item.disciplina}
              </span>
              <span className="font-mono text-[12px] font-semibold text-[#64748B]">
                {item.peso}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-500"
                  style={{ width: `${Math.min(item.progresso, 100)}%` }}
                />
              </div>
              <span className="font-mono text-[12px] font-medium text-teal-600 min-w-[36px] text-right">
                {item.progresso}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
