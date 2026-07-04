import { Upload, FileText, CheckCircle } from "lucide-react";

interface EmptyStatesProps {
  variant: "sem-edital" | "sem-prova" | "dia-concluido";
  streak?: number;
}

export default function EmptyStates({ variant, streak = 0 }: EmptyStatesProps) {
  if (variant === "sem-edital") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-8 py-12 text-center" aria-label="Nenhum edital cadastrado">
        <Upload size={48} className="text-[#CBD5E1]" />
        <h3 className="mt-4 font-heading text-[18px] font-semibold text-[#1E293B]">
          Nenhum edital ainda
        </h3>
        <p className="mt-2 text-[14px] text-[#64748B] font-satoshi max-w-sm">
          Suba seu edital e a Trilha monta seu cronograma em segundos.
        </p>
        <a
          href="/dashboard/concurso"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-[14px] font-medium text-white hover:bg-teal-700 transition-colors"
        >
          Subir meu primeiro edital →
        </a>
      </div>
    );
  }

  if (variant === "sem-prova") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-8 py-12 text-center" aria-label="Nenhuma prova anterior">
        <FileText size={48} className="text-[#CBD5E1]" />
        <h3 className="mt-4 font-heading text-[18px] font-semibold text-[#1E293B]">
          Nenhuma prova anterior
        </h3>
        <p className="mt-2 text-[14px] text-[#64748B] font-satoshi max-w-sm">
          Suba provas antigas da sua banca para treinar e entender o padrão.
        </p>
        <a
          href="/dashboard/concurso"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-[14px] font-medium text-white hover:bg-teal-700 transition-colors"
        >
          Subir prova antiga
        </a>
      </div>
    );
  }

  if (variant === "dia-concluido") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-8 py-12 text-center" aria-label="Dia concluído">
        <CheckCircle size={48} className="text-[#059669]" />
        <h3 className="mt-4 font-heading text-[18px] font-semibold text-[#1E293B]">
          Dia concluído! 🎉
        </h3>
        <p className="mt-2 text-[14px] text-[#64748B] font-satoshi">
          Você cumpriu todas as sessões de hoje.
          {streak > 0 && <> Sequência atual: {streak} dias 🔥</>}
        </p>
        <button
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-6 py-3 text-[14px] font-medium text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
          onClick={() => {
            // Rolagem para o topo ou ação futura
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Ver amanhã
        </button>
      </div>
    );
  }

  return null;
}
