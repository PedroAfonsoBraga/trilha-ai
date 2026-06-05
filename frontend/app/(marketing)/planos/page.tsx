import Link from "next/link";
import CheckoutButton from "@/components/app/checkout-button";

const plans = [
  {
    nome: "Free",
    preco: "Gratis",
    descricao: "Para comecar",
    features: [
      "3 editais por mes",
      "5 PDFs por mes",
      "5 flashcards por PDF",
    ],
    priceId: null,
    destaque: false,
  },
  {
    nome: "Estudante",
    preco: "R$ 19,90",
    descricao: "Para concurseiros dedicados",
    features: [
      "Editais ilimitados",
      "PDFs ilimitados",
      "Flashcards ilimitados",
    ],
    priceId: "price_1TeSV1JcyDCmwkxi6MP6xscY",
    destaque: true,
  },
  {
    nome: "Pro",
    preco: "R$ 39,90",
    descricao: "Tudo incluso",
    features: [
      "Tudo do Estudante",
      "Concurso Assistant",
      "Suporte prioritario",
    ],
    priceId: "price_1TeSV4JcyDCmwkxiIXNSXx4X",
    destaque: false,
  },
];

export default function PlanosPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-teal-600">
            Trilha
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-600 hover:text-teal-600">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-24">
        <h1 className="text-center text-4xl font-bold text-slate-900">
          Escolha seu plano
        </h1>
        <p className="mt-4 text-center text-slate-600">
          Comece gratis e faca upgrade quando quiser
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.nome}
              className={`rounded-xl border p-8 ${
                plan.destaque
                  ? "border-teal-500 bg-white shadow-lg ring-2 ring-teal-500"
                  : "border-slate-200 bg-white"
              }`}
            >
              <h3 className="text-lg font-semibold text-slate-900">{plan.nome}</h3>
              <p className="mt-2 text-3xl font-bold text-slate-900">{plan.preco}</p>
              <p className="text-sm text-slate-500">/mes</p>
              <p className="mt-1 text-sm text-slate-600">{plan.descricao}</p>
              <ul className="mt-6 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center text-sm text-slate-600">
                    <svg className="mr-2 h-4 w-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.priceId ? (
                <CheckoutButton
                  priceId={plan.priceId}
                  label="Assinar"
                  variant={plan.destaque ? "primary" : "outline"}
                />
              ) : (
                <Link
                  href="/cadastro"
                  className="mt-8 block w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Comecar gratis
                </Link>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
