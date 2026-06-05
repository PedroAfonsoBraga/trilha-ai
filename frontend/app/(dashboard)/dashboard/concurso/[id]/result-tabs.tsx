"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Document,
  ParsedEdital,
  CronogramaItem,
  FichamentoData,
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
  const [activeTab, setActiveTab] = useState<"parsed" | "cronograma" | "fichamento">(
    doc.tipo === "edital" ? "parsed" : "fichamento"
  );
  const [parsed, setParsed] = useState<ParsedEdital | null>(initialParsed);
  const [cronograma, setCronograma] = useState<CronogramaItem[] | null>(initialCronograma);
  const [fichamento, setFichamento] = useState<FichamentoData | null>(initialFichamento);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const tabs = [
    ...(doc.tipo === "edital"
      ? [
          { key: "parsed" as const, label: "Análise do Edital" },
          { key: "cronograma" as const, label: "Cronograma" },
        ]
      : []),
    { key: "fichamento" as const, label: "Fichamento ABNT" },
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
            <ScheduleView cronograma={cronograma} docId={docId} />
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

function ScheduleView({ cronograma, docId }: { cronograma: CronogramaItem[]; docId: string }) {
  const semanas = new Map<number, CronogramaItem[]>();
  for (const item of cronograma) {
    const s = item.semana;
    if (!semanas.has(s)) semanas.set(s, []);
    semanas.get(s)!.push(item);
  }

  return (
    <div>
      <div className="mb-4">
        <a
          href={`${API_URL}/api/documents/${docId}/cronograma.ics`}
          className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Baixar .ics (Google Calendar)
        </a>
      </div>
      <div className="space-y-4">
        {Array.from(semanas.entries()).map(([semana, itens]) => (
          <div key={semana} className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Semana {semana} &mdash; {itens[0]?.periodo}
            </h3>
            <div className="space-y-1">
              {itens.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-700">{item.disciplina}</span>
                  <span className="text-slate-500">{item.horas}h</span>
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
