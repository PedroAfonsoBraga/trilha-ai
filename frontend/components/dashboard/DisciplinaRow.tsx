import BancaTag from "./BancaTag";

interface DisciplinaRowProps {
  disciplina: string;
  horas: number;
  progressoPct: number;
  status: "em_dia" | "atrasado" | "critico" | "a_iniciar" | "pendente" | "concluido" | "pulado";
  dotColor: string;
  banca?: string;
}

const statusLabels: Record<string, string> = {
  em_dia: "Em dia",
  atrasado: "Atrasado",
  critico: "Crítico",
  a_iniciar: "A iniciar",
  pendente: "Pendente",
  concluido: "Concluído",
  pulado: "Pulado",
};

export default function DisciplinaRow({
  disciplina,
  horas,
  progressoPct,
  status,
  dotColor,
  banca,
}: DisciplinaRowProps) {
  const barColor = dotColor; // same as dot

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4 transition-all hover:border-[#CBD5E1]">
      {/* Status dot */}
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[15px] font-semibold text-[#1E293B] font-satoshi">
            {disciplina}
          </p>
          {banca && (
            <BancaTag banca={banca} mensagem={banca} />
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(progressoPct, 100)}%`,
                backgroundColor: barColor,
              }}
            />
          </div>
          <span className="font-mono text-[13px] font-semibold text-[#64748B]">
            {progressoPct}%
          </span>
        </div>

        {/* Status + time */}
        <p className="mt-1 text-[13px] text-[#64748B] font-satoshi">
          {statusLabels[status] || status} · {horas}h
        </p>
      </div>

      {/* CTA button */}
      <button className="shrink-0 rounded-lg border border-teal-600 px-3.5 py-1.5 text-[13px] font-medium text-teal-600 transition-colors hover:bg-teal-50">
        {status === "em_dia" && progressoPct >= 90 ? "Revisar" : "Iniciar"}
      </button>
    </div>
  );
}
