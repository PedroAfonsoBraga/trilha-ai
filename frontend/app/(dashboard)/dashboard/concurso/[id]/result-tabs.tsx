"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  Document,
  ParsedEdital,
  CronogramaItem,
  FichamentoData,
  Flashcard,
  ProgressSummary,
} from "@/types/documents";

interface ResultTabsProps {
  docId: string;
  accessToken: string;
  doc: Document;
  parsed: ParsedEdital | null;
  cronograma: CronogramaItem[] | null;
  fichamento: FichamentoData | null;
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
  cronograma: initialCronograma,
  fichamento: initialFichamento,
}: ResultTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"parsed" | "cronograma" | "fichamento" | "flashcards">(
    doc.tipo === "edital" ? "parsed" : "fichamento"
  );
  const [parsed, setParsed] = useState<ParsedEdital | null>(initialParsed);
  const [cronograma, setCronograma] = useState<CronogramaItem[] | null>(initialCronograma);
  const [fichamento, setFichamento] = useState<FichamentoData | null>(initialFichamento);
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const loadProgress = useCallback(async () => {
    try {
      const result = await fetchApi(`/api/documents/${docId}/progress`, accessToken);
      if (result) {
        setProgressSummary(result.summary || null);
      }
    } catch { /* silent */ }
  }, [docId, accessToken]);

  useEffect(() => {
    if (cronograma && cronograma.length > 0) {
      loadProgress();
    }
  }, [cronograma, loadProgress]);

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

  async function handleSchedule() {
    setLoading("schedule");
    setError(null);
    try {
      const result = await fetchApi(`/api/documents/${docId}/cronograma`, accessToken, { method: "POST" });
      if (result) setCronograma(result);
    } catch {
      setError("Erro ao gerar cronograma");
    } finally {
      setLoading(null);
      router.refresh();
    }
  }

  async function handleAdjustedSchedule() {
    setLoading("adjusted");
    setError(null);
    try {
      const result = await fetchApi(`/api/documents/${docId}/cronograma/ajustado`, accessToken, { method: "POST" });
      if (result) setCronograma(result);
    } catch {
      setError("Erro ao gerar cronograma ajustado");
    } finally {
      setLoading(null);
    }
  }

  async function handleUrgencySchedule() {
    setLoading("urgency");
    setError(null);
    try {
      const result = await fetchApi(
        `/api/documents/${docId}/cronograma/urgencia`,
        accessToken,
        { method: "POST", body: JSON.stringify({ horas_por_dia: 8 }) }
      );
      if (result) setCronograma(result);
    } catch {
      setError("Erro ao gerar modo urgência");
    } finally {
      setLoading(null);
    }
  }

  async function handleRecalculate() {
    setLoading("recalculate");
    setError(null);
    try {
      const result = await fetchApi(`/api/documents/${docId}/cronograma/recalcular`, accessToken, { method: "POST" });
      if (result) setCronograma(result);
    } catch {
      setError("Erro ao recalcular cronograma");
    } finally {
      setLoading(null);
    }
  }

  async function handleToggleProgress(semana: number, disciplina: string, currentlyCompleted: boolean) {
    try {
      await fetchApi(
        `/api/documents/${docId}/progress`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            semana,
            disciplina,
            completed: !currentlyCompleted,
            horas_estudadas: !currentlyCompleted ? 2 : 0,
          }),
        }
      );
      setCronograma((prev) =>
        prev?.map((item) =>
          item.semana === semana && item.disciplina === disciplina
            ? { ...item, completed: !currentlyCompleted }
            : item
        ) ?? null
      );
      loadProgress();
    } catch {
      setError("Erro ao atualizar progresso");
    }
  }

  async function handleFichamento() {
    setLoading("fichamento");
    setError(null);
    try {
      const result = await fetchApi(`/api/documents/${docId}/fichamento`, accessToken, { method: "POST" });
      if (result) setFichamento(result);
    } catch {
      setError("Erro ao gerar fichamento");
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
    const exportType = activeTab === "cronograma" ? "cronograma" : activeTab === "fichamento" ? "fichamento" : "flashcards";
    try {
      const result = await fetchApi(
        `/api/share/${docId}/${exportType}`,
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
      ? [
          { key: "parsed" as const, label: "Análise do Edital" },
          { key: "cronograma" as const, label: "Cronograma" },
        ]
      : []),
    { key: "fichamento" as const, label: "Fichamento ABNT" },
    { key: "flashcards" as const, label: "Flashcards" },
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
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 mb-4">{error}</p>
      )}

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

      {activeTab === "cronograma" && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          {cronograma && cronograma.length > 0 ? (
            <ScheduleView
              cronograma={cronograma}
              docId={docId}
              loading={loading}
              progressSummary={progressSummary}
              onToggleProgress={handleToggleProgress}
              onAdjustedSchedule={handleAdjustedSchedule}
              onUrgencySchedule={handleUrgencySchedule}
              onRecalculate={handleRecalculate}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">
                {parsed ? "Nenhum cronograma gerado" : "Analise o edital primeiro"}
              </p>
              <button
                onClick={handleSchedule}
                disabled={loading === "schedule" || !parsed}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {loading === "schedule" ? "Gerando..." : "Gerar cronograma"}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "fichamento" && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          {fichamento ? (
            <FichamentoView fichamento={fichamento} docId={docId} />
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">Nenhum fichamento disponível</p>
              <button
                onClick={handleFichamento}
                disabled={loading === "fichamento"}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {loading === "fichamento" ? "Gerando..." : "Gerar fichamento"}
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
                <span className="text-slate-900 font-medium">{d.data}</span>
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

function ScheduleView({
  cronograma,
  docId,
  loading,
  progressSummary,
  onToggleProgress,
  onAdjustedSchedule,
  onUrgencySchedule,
  onRecalculate,
}: {
  cronograma: CronogramaItem[];
  docId: string;
  loading: string | null;
  progressSummary: ProgressSummary | null;
  onToggleProgress: (semana: number, disciplina: string, completed: boolean) => void;
  onAdjustedSchedule: () => void;
  onUrgencySchedule: () => void;
  onRecalculate: () => void;
}) {
  const semanas = new Map<number, CronogramaItem[]>();
  for (const item of cronograma) {
    const s = item.semana;
    if (!semanas.has(s)) semanas.set(s, []);
    semanas.get(s)!.push(item);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <a
          href={`${API_URL}/api/documents/${docId}/cronograma.ics`}
          className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Baixar .ics
        </a>
        <button
          onClick={onAdjustedSchedule}
          disabled={loading === "adjusted"}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-colors disabled:opacity-50"
        >
          {loading === "adjusted" ? "Ajustando..." : "Cronograma ajustado"}
        </button>
        <button
          onClick={onUrgencySchedule}
          disabled={loading === "urgency"}
          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {loading === "urgency" ? "Gerando..." : "Modo urgência"}
        </button>
        <button
          onClick={onRecalculate}
          disabled={loading === "recalculate"}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
        >
          {loading === "recalculate" ? "Recalculando..." : "Recalcular por atraso"}
        </button>
      </div>

      {progressSummary && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3 border border-slate-200">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-slate-500">Progresso: </span>
              <span className="font-medium text-slate-900">
                {progressSummary.completed_items}/{progressSummary.total_items} ({progressSummary.completion_rate}%)
              </span>
            </div>
            <div>
              <span className="text-slate-500">Horas: </span>
              <span className="font-medium text-slate-900">{progressSummary.total_horas}h</span>
            </div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-teal-500 transition-all"
                  style={{ width: `${progressSummary.completion_rate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Array.from(semanas.entries()).map(([semana, itens]) => (
          <div key={semana} className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Semana {semana} &mdash; {itens[0]?.periodo}
            </h3>
            <div className="space-y-1">
              {itens.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between text-sm py-1 px-2 rounded ${
                    item.completed ? "bg-teal-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.completed || false}
                      onChange={() => onToggleProgress(item.semana, item.disciplina, item.completed || false)}
                      className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className={`${item.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                      {item.disciplina}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.modo === "urgencia" && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Urgente</span>
                    )}
                    {item.ajustado && (
                      <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">Ajustado</span>
                    )}
                    <span className="text-slate-500">{item.horas}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FichamentoView({ fichamento, docId }: { fichamento: FichamentoData; docId: string }) {
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <a
          href={`${API_URL}/api/documents/${docId}/fichamento.docx`}
          className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Baixar .docx
        </a>
      </div>

      {fichamento.referencia && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase">Referência</span>
          <p className="text-slate-700 mt-1 text-sm">{fichamento.referencia}</p>
        </div>
      )}
      {fichamento.tema && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase">Tema</span>
          <p className="text-slate-900 mt-1">{fichamento.tema}</p>
        </div>
      )}
      {fichamento.objetivo && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase">Objetivo</span>
          <p className="text-slate-700 mt-1 text-sm">{fichamento.objetivo}</p>
        </div>
      )}
      {fichamento.metodologia && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase">Metodologia</span>
          <p className="text-slate-700 mt-1 text-sm">{fichamento.metodologia}</p>
        </div>
      )}
      {fichamento.principais_pontos && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase">Principais pontos</span>
          <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-slate-700">
            {fichamento.principais_pontos.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {fichamento.citacoes_relevantes && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase">Citações relevantes</span>
          <div className="mt-2 space-y-2">
            {fichamento.citacoes_relevantes.map((c, i) => (
              <blockquote key={i} className="border-l-4 border-teal-200 pl-4 py-1 text-sm text-slate-600 italic">
                &ldquo;{c}&rdquo;
              </blockquote>
            ))}
          </div>
        </div>
      )}
      {fichamento.conclusao && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase">Conclusão</span>
          <p className="text-slate-700 mt-1 text-sm">{fichamento.conclusao}</p>
        </div>
      )}
      {fichamento.comentarios && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase">Comentários</span>
          <p className="text-slate-700 mt-1 text-sm">{fichamento.comentarios}</p>
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
