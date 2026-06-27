"use client";

import { useState, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TccSection {
  titulo: string;
  tipo: string;
  pagina_estimada: number | null;
  completude: string;
  sugestoes: string[];
}

interface TccAnalysis {
  secoes: TccSection[];
  estrutura_geral: string;
  secoes_ausentes: string[];
  recomendacoes_estrutura: string[];
}

interface TccReviewIssue {
  trecho: string;
  tipo: string;
  gravidade: string;
  sugestao_generica: string;
}

interface TccReview {
  problemas: TccReviewIssue[];
  resumo_geral: string;
  pontos_fortes: string[];
}

interface TccReferenceElementos {
  autor: string;
  titulo: string;
  edicao: string;
  local: string;
  editora: string;
  ano: string;
}

interface TccReference {
  texto_extraido: string;
  elementos_obrigatorios: TccReferenceElementos;
  conforme_abnt: boolean;
  problemas: string[];
  sugestao_correcao: string;
}

interface TccReferences {
  referencias: TccReference[];
  total_referencias: number;
  conformidade_geral: number;
  recomendacoes: string[];
}

type Tab = "estrutura" | "revisao" | "referencias";

interface TccClientProps {
  docId: string;
  accessToken: string;
  initialAnalysis: TccAnalysis | null;
  initialReview: TccReview | null;
  initialReferences: TccReferences | null;
}

function SectionCard({ section }: { section: TccSection }) {
  const completudeColor: Record<string, string> = {
    completa: "bg-green-100 text-green-700",
    parcial: "bg-amber-100 text-amber-700",
    ausente: "bg-red-100 text-red-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-900">{section.titulo}</h4>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${completudeColor[section.completude] || "bg-slate-100 text-slate-600"}`}>
          {section.completude}
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-1">Tipo: {section.tipo}</p>
      {section.sugestoes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {section.sugestoes.map((s, i) => (
            <li key={i} className="text-sm text-slate-600 flex gap-1">
              <span className="text-teal-500 mt-0.5 shrink-0">•</span>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IssueCard({ issue }: { issue: TccReviewIssue }) {
  const gravidadeColor: Record<string, string> = {
    alta: "border-red-300 bg-red-50",
    media: "border-amber-300 bg-amber-50",
    baixa: "border-blue-300 bg-blue-50",
  };
  const gravidadeLabel: Record<string, string> = {
    alta: "Alta",
    media: "Média",
    baixa: "Baixa",
  };

  return (
    <div className={`rounded-lg border p-4 ${gravidadeColor[issue.gravidade] || "border-slate-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="rounded bg-slate-700 px-2 py-0.5 text-xs font-medium text-white">
          {issue.tipo}
        </span>
        <span className="text-xs font-medium text-slate-500">
          {gravidadeLabel[issue.gravidade] || issue.gravidade}
        </span>
      </div>
      <p className="text-sm text-slate-700 mb-1">
        <span className="font-medium">Trecho:</span> &ldquo;{issue.trecho}&rdquo;
      </p>
      <p className="text-sm text-slate-600">
        <span className="font-medium">Sugestão:</span> {issue.sugestao_generica}
      </p>
    </div>
  );
}

function ReferenceCard({ ref }: { ref: TccReference }) {
  return (
    <div className={`rounded-lg border p-4 ${ref.conforme_abnt ? "border-green-200" : "border-red-200"}`}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-700 flex-1">{ref.texto_extraido}</p>
        <span className={`shrink-0 ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${ref.conforme_abnt ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {ref.conforme_abnt ? "OK" : "Revisar"}
        </span>
      </div>
      {ref.problemas.length > 0 && (
        <ul className="mt-2 space-y-1">
          {ref.problemas.map((p, i) => (
            <li key={i} className="text-sm text-red-600 flex gap-1">
              <span className="mt-0.5 shrink-0">•</span>
              {p}
            </li>
          ))}
        </ul>
      )}
      {ref.sugestao_correcao && (
        <p className="mt-2 text-sm text-slate-500 italic">{ref.sugestao_correcao}</p>
      )}
    </div>
  );
}

export default function TccClient({ docId, accessToken, initialAnalysis, initialReview, initialReferences }: TccClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("estrutura");
  const [analysis, setAnalysis] = useState<TccAnalysis | null>(initialAnalysis);
  const [review, setReview] = useState<TccReview | null>(initialReview);
  const [references, setReferences] = useState<TccReferences | null>(initialReferences);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const callAnalysis = useCallback(async (endpoint: string, stateKey: string) => {
    // Previne clique duplicado enquanto uma análise do mesmo tipo está rodando
    if (loading === stateKey) return;
    setLoading(stateKey);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/tcc/${docId}/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Erro na análise");
      }
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setters: Record<string, (v: any) => void> = {
        analyze: setAnalysis,
        review: setReview,
        references: setReferences,
      };
      setters[stateKey]?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(null);
    }
  }, [docId, accessToken, loading]);

  const downloadReport = useCallback(async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_URL}/api/tcc/${docId}/report.docx`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Erro ao baixar relatório");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_tcc_${docId.slice(0, 8)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao baixar");
    } finally {
      setDownloading(false);
    }
  }, [docId, accessToken]);

  const needsAnalysis = !analysis;
  const needsReview = !review;
  const needsReferences = !references;
  const allComplete = analysis && review && references;

  const tabs: { key: Tab; label: string; needs: boolean }[] = [
    { key: "estrutura", label: "Estrutura", needs: needsAnalysis },
    { key: "revisao", label: "Revisão Textual", needs: needsReview },
    { key: "referencias", label: "Referências ABNT", needs: needsReferences },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <a href="/dashboard" className="text-sm text-teal-600 hover:text-teal-700 mb-4 inline-block">
          &larr; Voltar ao Dashboard
        </a>

        <h1 className="text-2xl font-bold text-slate-900">TCC Assistant</h1>
        <p className="mt-1 text-slate-600">Análise completa do seu trabalho acadêmico.</p>

        {!allComplete && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Análises Pendentes</h2>
            <div className="space-y-3">
              {needsAnalysis && (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Análise de Estrutura</p>
                    <p className="text-sm text-slate-500">Identifica seções do TCC e sugere melhorias</p>
                  </div>
                  <button
                    onClick={() => callAnalysis("analyze", "analyze")}
                    disabled={loading === "analyze"}
                    className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {loading === "analyze" ? "Analisando..." : "Analisar"}
                  </button>
                </div>
              )}
              {needsReview && (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Revisão Textual</p>
                    <p className="text-sm text-slate-500">Avalia clareza, coesão e coerência do texto</p>
                  </div>
                  <button
                    onClick={() => callAnalysis("review", "review")}
                    disabled={loading === "review"}
                    className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {loading === "review" ? "Revisando..." : "Revisar"}
                  </button>
                </div>
              )}
              {needsReferences && (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Referências ABNT</p>
                    <p className="text-sm text-slate-500">Extrai e valida referências conforme NBR 6023</p>
                  </div>
                  <button
                    onClick={() => callAnalysis("references", "references")}
                    disabled={loading === "references"}
                    className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {loading === "references" ? "Verificando..." : "Verificar"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {(analysis || review || references) && (
          <div className="mt-6">
            <div className="flex gap-1 border-b border-slate-200">
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
            </div>

            <div className="mt-6">
              {error && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
              )}

              {activeTab === "estrutura" && analysis && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">{analysis.estrutura_geral}</p>
                  <div className="grid gap-3">
                    {analysis.secoes.map((sec, i) => (
                      <SectionCard key={i} section={sec} />
                    ))}
                  </div>
                  {analysis.secoes_ausentes.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <h3 className="font-medium text-amber-800">Seções não identificadas</h3>
                      <ul className="mt-2 space-y-1">
                        {analysis.secoes_ausentes.map((s, i) => (
                          <li key={i} className="text-sm text-amber-700 flex gap-1">
                            <span className="mt-0.5 shrink-0">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.recomendacoes_estrutura.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <h3 className="font-medium text-slate-900 mb-2">Recomendações</h3>
                      <ul className="space-y-1">
                        {analysis.recomendacoes_estrutura.map((r, i) => (
                          <li key={i} className="text-sm text-slate-600 flex gap-1">
                            <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "revisao" && review && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">{review.resumo_geral}</p>
                  {review.problemas.length === 0 ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
                      <p className="text-green-700 font-medium">Nenhum problema significativo encontrado.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {review.problemas.map((issue, i) => (
                        <IssueCard key={i} issue={issue} />
                      ))}
                    </div>
                  )}
                  {review.pontos_fortes.length > 0 && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <h3 className="font-medium text-green-800 mb-2">Pontos fortes</h3>
                      <ul className="space-y-1">
                        {review.pontos_fortes.map((p, i) => (
                          <li key={i} className="text-sm text-green-700 flex gap-1">
                            <span className="mt-0.5 shrink-0">✓</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "referencias" && references && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-white border border-slate-200 p-4 flex-1">
                      <p className="text-sm text-slate-500">Total de referências</p>
                      <p className="text-2xl font-bold text-slate-900">{references.total_referencias}</p>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-4 flex-1">
                      <p className="text-sm text-slate-500">Conformidade ABNT</p>
                      <p className="text-2xl font-bold text-slate-900">{references.conformidade_geral}%</p>
                    </div>
                  </div>
                  {references.recomendacoes.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <h3 className="font-medium text-amber-800 mb-2">Recomendações gerais</h3>
                      <ul className="space-y-1">
                        {references.recomendacoes.map((r, i) => (
                          <li key={i} className="text-sm text-amber-700 flex gap-1">
                            <span className="mt-0.5 shrink-0">•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid gap-3">
                    {references.referencias.map((ref, i) => (
                      <ReferenceCard key={i} ref={ref} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {allComplete && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Relatório Completo</h2>
                <p className="text-sm text-slate-500">Baixe o relatório consolidado em formato .docx</p>
              </div>
              <button
                onClick={downloadReport}
                disabled={downloading}
                className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {downloading ? "Gerando..." : "Baixar Relatório (.docx)"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm border border-teal-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Chat sobre o TCC</h2>
          <p className="text-sm text-slate-600 mb-4">
            Tire dúvidas específicas sobre o conteúdo do seu TCC com a IA contextual.
          </p>
          <a
            href={`/dashboard/chat?doc_id=${docId}`}
            className="inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 transition-colors"
          >
            Abrir Chat com este TCC
          </a>
        </div>
      </div>
    </div>
  );
}
