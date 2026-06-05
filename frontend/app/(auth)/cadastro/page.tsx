import { signup } from "../login/actions";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-teal-600">Trilha</h1>
          <p className="mt-2 text-slate-600">Crie sua conta gratuita</p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <form className="space-y-4">
          <input type="hidden" name="next" value={next || ""} />
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-slate-700">
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Minimo 6 caracteres"
            />
          </div>

          <button
            formAction={signup}
            className="w-full rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 transition-colors"
          >
            Criar conta
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Ja tem conta?{" "}
          <a
            href={"/login" + (next ? `?next=${encodeURIComponent(next)}` : "")}
            className="text-teal-600 hover:underline"
          >
            Entrar
          </a>
        </p>
      </div>
    </div>
  );
}
