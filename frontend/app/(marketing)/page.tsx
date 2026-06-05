import Link from "next/link";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-xl font-bold text-teal-600">Trilha</span>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-600 hover:text-teal-600">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 transition-colors"
            >
              Começar grátis
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">
          Sua jornada de estudos{" "}
          <span className="text-teal-600">começa aqui</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Flashcards inteligentes, fichamento ABNT e cronogramas de estudo
          gerados por IA para concursos públicos.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/cadastro"
            className="rounded-lg bg-teal-600 px-6 py-3 font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Começar agora
          </Link>
          <Link
            href="/planos"
            className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Ver planos
          </Link>
        </div>
      </main>
    </div>
  );
}
