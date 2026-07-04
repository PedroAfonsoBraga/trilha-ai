import { Lock, Zap } from "lucide-react";

interface ChatProWidgetProps {
  plano: string;
}

const sugestoes = [
  "Quantas vagas?",
  "Data da prova?",
  "Posso usar calculadora?",
  "Peso de Informática?",
];

export default function ChatProWidget({ plano }: ChatProWidgetProps) {
  const isPro = plano === "pro";

  if (!isPro) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="label">PERGUNTE AO EDITAL</p>
          <span className="rounded-full bg-teal-600/20 px-2 py-0.5 text-[9px] font-semibold text-teal-600 uppercase">
            Pro
          </span>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 text-center">
          <Lock size={24} className="mx-auto text-[#94A3B8]" />
          <p className="mt-2 text-[13px] font-medium text-[#64748B] font-satoshi">
            Disponível no plano Pro
          </p>
          <a
            href="/dashboard/plano"
            className="mt-3 inline-block rounded-lg border border-teal-600 px-4 py-2 text-[13px] font-medium text-teal-600 hover:bg-teal-50 transition-colors"
          >
            Fazer upgrade
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <p className="label">PERGUNTE AO EDITAL</p>
        <span className="rounded-full bg-teal-600/20 px-2 py-0.5 text-[9px] font-semibold text-teal-600 uppercase">
          Pro
        </span>
      </div>

      {/* Chat input */}
      <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5">
        <input
          type="text"
          placeholder="Ex: Posso usar calculadora?"
          className="flex-1 text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] outline-none bg-transparent font-satoshi"
        />
        <button className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors">
          <Zap size={14} />
        </button>
      </div>

      {/* Sugestões rápidas */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {sugestoes.map((sug) => (
          <button
            key={sug}
            className="rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-2.5 py-1 text-[12px] text-teal-700 hover:bg-teal-100 transition-colors font-satoshi"
          >
            {sug}
          </button>
        ))}
      </div>
    </div>
  );
}
