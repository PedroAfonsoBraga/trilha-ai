"use client";

import ProgressRing from "./ProgressRing";

interface ProvaCountdownProps {
  diasRestantes: number | null;
  dataProva: string | null;
}

export default function ProvaCountdown({ diasRestantes, dataProva }: ProvaCountdownProps) {
  if (diasRestantes === null || diasRestantes === undefined) {
    return null;
  }

  // Calcula percentual de tempo decorrido (assume prazo máximo de 365 dias)
  const tempoDecorridoPct = Math.min(
    Math.round(((365 - diasRestantes) / 365) * 100),
    100
  );

  return (
    <div>
      <p className="label mb-3">DIAS PARA A PROVA</p>

      <div className="flex flex-col items-center">
        <ProgressRing
          percent={tempoDecorridoPct}
          size={120}
          strokeWidth={8}
          color="#0D9488"
          bgColor="#E2E8F0"
          label={`${diasRestantes} dias para a prova`}
        >
          <div className="text-center">
            <p className="font-mono text-[28px] font-extrabold text-[#0D9488] leading-none">
              {diasRestantes}
            </p>
            <p className="text-[14px] text-[#64748B] font-satoshi">dias</p>
          </div>
        </ProgressRing>

        {dataProva && (
          <p className="mt-3 text-[13px] font-medium text-[#64748B] font-satoshi">
            {new Date(dataProva).toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
