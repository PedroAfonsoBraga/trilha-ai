"use client";

interface Banca {
  sigla: string;
  nome: string;
  color: string;
}

const bancas: Banca[] = [
  { sigla: "CESPE", nome: "Centro de Seleção e Promoção de Eventos", color: "bg-primary/10 text-primary" },
  { sigla: "CEBRASPE", nome: "Centro Brasileiro de Pesquisa em Avaliação", color: "bg-primary/10 text-primary" },
  { sigla: "FCC", nome: "Fundação Carlos Chagas", color: "bg-primary/10 text-primary" },
  { sigla: "Vunesp", nome: "Fundação Vunesp", color: "bg-primary/10 text-primary" },
  { sigla: "FGV", nome: "Fundação Getulio Vargas", color: "bg-primary/10 text-primary" },
  { sigla: "IBFC", nome: "Instituto Brasileiro de Formação e Capacitação", color: "bg-primary/10 text-primary" },
];

export function BancasMarquee() {
  return (
    <section className="border-y border-border bg-card py-10">
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Reconhece automaticamente o padrão de cada banca
      </p>

      <div className="flex justify-center gap-8 flex-wrap px-4">
        {bancas.map((banca) => (
          <div
            key={banca.sigla}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold ${banca.color}`}
          >
            <span className="text-lg font-bold">{banca.sigla}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
