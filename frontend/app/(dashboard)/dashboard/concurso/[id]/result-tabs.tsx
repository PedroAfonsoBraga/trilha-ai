"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Document,
  ParsedEdital,
  Flashcard,
} from "@/types/documents";

interface ResultTabsProps {
  docId: string;
  accessToken: string;
  doc: Document;
  parsed: ParsedEdital | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi(
  endpoint: string,
  token: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export default function ResultTabs({
  docId,
  accessToken,
  doc,
  parsed: initialParsed,
}: ResultTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"parsed" | "flashcards" | "chat">(
    doc.tipo === "edital" ? "parsed" : "flashcards"
  );
  const [parsed, setParsed] = useState<ParsedEdital | null>(initialParsed);
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  async function handleParse() {
    setLoading("parsing");
    setError(null);
    try {
      const result = await fetchApi(`/api/documents/${docId}/parse`, accessToken, { method: "POST" });
      if (result) setParsed(result);
    } catch {
      setError("Erro ao analisar edital");
    } finally {
      setLoading(null);
      router.refresh();
    }
  }

  async function handleFlashcards() {
    setLoading("flashcards");
    setError(null);
    try {
      const result = await fetchApi(`/api/documents/${docId}/flashcards`, accessToken, { method: "POST" });
      if (result?.flashcards) {
        setFlashcards(result.flashcards);
      } else {
        const list = await fetchApi(`/api/documents/${docId}/flashcards`, accessToken);
        if (list) setFlashcards(list);
      }
    } catch {
      setError("Erro ao gerar flashcards");
    } finally {
      setLoading(null);
      router.refresh();
    }
  }

  async function loadFlashcards() {
    setLoading("loading_flashcards");
    setError(null);
    try {
      const list = await fetchApi(`/api/documents/${docId}/flashcards`, accessToken);
      if (list) setFlashcards(list);
    } catch {
      setError("Erro ao carregar flashcards");
    } finally {
      setLoading(null);
    }
  }

  async function handleShare() {
    if (shareUrl) {
      await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      return;
    }

    setLoading("share");
    setError(null);
    try {
      const result = await fetchApi(
        `/api/share/${docId}/flashcards`,
        accessToken,
        { method: "POST" }
      );
      if (result) {
        const fullUrl = `${window.location.origin}${result.url}`;
        setShareUrl(result.url);
        await navigator.clipboard.writeText(fullUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      setError("Erro ao criar link de compartilhamento");
    } finally {
      setLoading(null);
    }
  }

  const tabs = [
    ...(doc.tipo === "edital"
      ? [{ key: "parsed" as const, label: "Análise do Edital" }]
      : [{ key: "flashcards" as const, label: "Flashcards" }]),
    { key: "chat" as const, label: doc.tipo === "edital" ? "Chat com o Edital" : "Chat com Documento" },
  ];

  return (
    <div>
      <div className="flex border-b border-slate-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {activeTab === "flashcards" && (
          <div className="ml-auto flex items-center">
            <button
              onClick={handleShare}
              disabled={loading === "share"}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-teal-300 hover:text-teal-600 transition-colors"
            >
              {shareCopied ? (
                <>Link copiado!</>
              ) : loading === "share" ? (
                <>Criando link...</>
              ) : shareUrl ? (
                <>Copiar link</>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Compartilhar
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 mb-4">{error}</p>
      )}

      <div className="max-h-[calc(100vh-240px)] overflow-y-auto pr-2 pb-8">
        {activeTab === "parsed" && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            {parsed ? (
              <ParsedView parsed={parsed} />
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-4">Nenhuma análise disponível</p>
                <button
                  onClick={handleParse}
                  disabled={loading === "parsing"}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {loading === "parsing" ? "Analisando..." : "Analisar edital"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "flashcards" && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            {flashcards && flashcards.length > 0 ? (
              <FlashcardsView flashcards={flashcards} docId={docId} />
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-4">Nenhum flashcard gerado</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleFlashcards}
                    disabled={loading === "flashcards"}
                    className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {loading === "flashcards" ? "Gerando..." : "Gerar flashcards"}
                  </button>
                  <button
                    onClick={loadFlashcards}
                    disabled={loading === "loading_flashcards"}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-teal-300 transition-colors"
                  >
                    {loading === "loading_flashcards" ? "Carregando..." : "Carregar existentes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Chat com {doc.tipo === "edital" ? "o Edital" : "o Documento"}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                Converse com a IA sobre o conteúdo deste documento. Tire dúvidas,
                peça resumos e aprofunde seu entendimento.
              </p>
              <a
                href={`/dashboard/chat?doc_id=${docId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Abrir chat com {doc.tipo === "edital" ? "este edital" : "este documento"}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ParsedView({ parsed }: { parsed: ParsedEdital }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {parsed.banca && (
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase">Banca</span>
            <p className="text-slate-900 font-medium capitalize">{parsed.banca}</p>
          </div>
        )}
        {parsed.cargo && (
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase">Cargo</span>
            <p className="text-slate-900">{parsed.cargo}</p>
          </div>
        )}
        {parsed.orgao && (
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase">Órgão</span>
            <p className="text-slate-900">{parsed.orgao}</p>
          </div>
        )}
        {parsed.salario_inicial && (
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase">Salário Inicial</span>
            <p className="text-slate-900">{parsed.salario_inicial}</p>
          </div>
        )}
        {parsed.total_vagas != null && (
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase">Vagas</span>
            <p className="text-slate-900">{parsed.total_vagas}</p>
          </div>
        )}
      </div>

      {parsed.resumo && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase">Resumo</span>
          <p className="text-slate-700 mt-1 text-sm">{parsed.resumo}</p>
        </div>
      )}

      {parsed.datas_importantes && parsed.datas_importantes.length > 0 && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase">Datas importantes</span>
          <div className="mt-2 space-y-2">
            {parsed.datas_importantes.map((d, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-700">{d.evento || "Data"}</span>
                <span className="text-slate-900 font-medium">
                  {(() => {
                    try { return new Date(d.data).toLocaleDateString("pt-BR"); }
                    catch { return d.data; }
                  })()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsed.disciplinas && parsed.disciplinas.length > 0 && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase">Disciplinas</span>
          <div className="mt-2 space-y-2">
            {parsed.disciplinas.map((d, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-700">{d.nome}</span>
                <span className="text-slate-500">
                  Peso {d.peso}
                  {d.num_questoes != null ? ` · ${d.num_questoes} questões` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FlashcardsView({ flashcards, docId }: { flashcards: Flashcard[]; docId: string }) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  function toggleFlip(id: string) {
    const next = new Set(flipped);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFlipped(next);
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <a
          href={`${API_URL}/api/documents/${docId}/flashcards.apkg`}
          className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Baixar .apkg (Anki)
        </a>
        <span className="text-sm text-slate-400 flex items-center">
          {flashcards.length} flashcard{flashcards.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {flashcards.map((fc) => (
          <button
            key={fc.id}
            onClick={() => toggleFlip(fc.id)}
            className="rounded-lg border border-slate-200 p-4 text-left hover:border-teal-300 transition-all min-h-[120px]"
          >
            {flipped.has(fc.id) ? (
              <p className="text-slate-700 text-sm leading-relaxed">{fc.verso}</p>
            ) : (
              <p className="font-medium text-slate-900">{fc.frente}</p>
            )}
            {fc.tags && fc.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {fc.tags.map((tag, j) => (
                  <span key={j} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">
              {flipped.has(fc.id) ? "Clique para ver a frente" : "Clique para ver o verso"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
