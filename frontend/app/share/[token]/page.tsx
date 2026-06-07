import type { SharedContent } from "@/types/documents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getSharedContent(token: string): Promise<{ data: SharedContent | null; error: string | null }> {
  try {
    const res = await fetch(`${API_URL}/api/share/public/${token}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 410) return { data: null, error: "Este link expirou (válido por 7 dias)." };
      return { data: null, error: "Link não encontrado." };
    }
    const data: SharedContent = await res.json();
    return { data, error: null };
  } catch {
    return { data: null, error: "Erro ao carregar conteúdo." };
  }
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data, error } = await getSharedContent(token);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-teal-600">Trilha</h1>
        </div>

        {error && (
          <div className="rounded-xl bg-white p-8 shadow-sm text-center">
            <p className="text-slate-600">{error}</p>
          </div>
        )}

        {data && (
          <div className="rounded-xl bg-white p-8 shadow-sm">
            <div className="mb-6">
              <span className="text-xs font-medium text-slate-500 uppercase">
                {data.export_type === "cronograma" ? "Cronograma" : data.export_type === "fichamento" ? "Fichamento" : "Flashcards"}
              </span>
              <h2 className="text-xl font-semibold text-slate-900 mt-1">{data.nome_original}</h2>
            </div>

            {data.export_type === "flashcards" && Array.isArray(data.content) && (
              <div className="grid gap-4">
                {(data.content as Array<{ frente: string; verso: string; tags: string[] }>).map((fc, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">{fc.frente}</p>
                    <p className="mt-2 text-slate-600 border-t border-slate-100 pt-2">{fc.verso}</p>
                    {fc.tags && fc.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {fc.tags.map((tag, j) => (
                          <span key={j} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {data.export_type === "cronograma" && typeof data.content === "object" && (
              <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-lg p-4 overflow-auto max-h-96">
                {JSON.stringify(data.content, null, 2)}
              </pre>
            )}

            {data.export_type === "fichamento" && typeof data.content === "object" && (
              <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-lg p-4 overflow-auto max-h-96">
                {JSON.stringify(data.content, null, 2)}
              </pre>
            )}
          </div>
        )}

        {data && (
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Gerado com{" "}
              <a href="/" className="text-teal-600 hover:underline font-medium">
                Trilha
              </a>{" "}
              — Inteligência Artificial para seus estudos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
