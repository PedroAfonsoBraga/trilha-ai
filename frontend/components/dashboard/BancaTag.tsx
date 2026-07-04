interface BancaTagProps {
  banca: string;
  mensagem?: string;
}

export default function BancaTag({ banca, mensagem }: BancaTagProps) {
  if (!banca) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-2 py-0.5 text-[11px] font-medium text-[#0D9488]">
      {mensagem || banca}
    </span>
  );
}
