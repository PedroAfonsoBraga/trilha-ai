import type { DashboardEditalAtivo } from "@/types/documents";

interface EditalCardProps {
  edital: DashboardEditalAtivo | null;
}

export default function EditalCard({ edital }: EditalCardProps) {
  if (!edital) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
        <p className="text-[15px] font-medium text-[#64748B]">Nenhum edital ativo</p>
        <p className="mt-1 text-[13px] text-[#94A3B8]">
          Faça upload de um edital para começar.
        </p>
        <a
          href="/dashboard/concurso"
          className="mt-3 inline-block rounded-lg bg-teal-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-teal-700 transition-colors"
        >
          Subir edital
        </a>
      </div>
    );
  }

  const progresso = edital.progresso_geral;

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-7 text-white">
      {/* Nome da prova */}
      <h3 className="font-heading text-xl font-bold leading-tight">{edital.nome}</h3>

      {/* Detalhes */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5">
        {edital.data_prova && (
          <span className="text-[13px] font-medium text-white/65">
            📅 Prova: {new Date(edital.data_prova).toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
        {edital.banca && (
          <span className="text-[13px] font-medium text-white/65">
            🏛️ Banca: {edital.banca}
          </span>
        )}
      </div>

      {/* Progresso */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-medium text-white/65">Progresso geral</span>
          <span className="font-mono text-[14px] font-semibold text-teal-400">
            {progresso}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-700"
            style={{ width: `${Math.min(progresso, 100)}%` }}
          />
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-5 flex items-center justify-between">
        {edital.dias_restantes !== null && edital.dias_restantes !== undefined ? (
          <span className="font-mono text-[14px] font-semibold text-teal-400">
            {edital.dias_restantes} dias restantes
          </span>
        ) : (
          <span />
        )}
        <a
          href={`/dashboard/concurso/${edital.documento_id}`}
          className="rounded-lg border border-white/30 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
        >
          Ver detalhes →
        </a>
      </div>
    </div>
  );
}
