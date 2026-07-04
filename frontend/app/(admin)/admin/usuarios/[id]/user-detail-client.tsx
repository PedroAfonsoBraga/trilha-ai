"use client";

import { useState } from "react";

interface Documento {
  id: string;
  nome: string;
  tipo: string;
  created_at: string;
  tamanho_bytes: number;
}

interface Subscription {
  plan_id: string;
  status: string;
  current_period_end: string;
}

interface UserDetails {
  user_id: string;
  email: string;
  nome: string;
  plano: string;
  perfil: string;
  criado_em: string;
  subscription: Subscription | null;
  documentos: Documento[];
  total_documentos: number;
  total_chunks: number;
  total_flashcards: number;
  custo_ia_por_mes: Record<string, number>;
}

interface Props {
  data: UserDetails | null;
  error: boolean;
  accessToken: string;
  apiUrl: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function tipoLabel(tipo: string): string {
  switch (tipo) {
    case "edital": return "Edital";
    case "pdf_generico": return "PDF de conteúdo";
    default: return tipo;
  }
}

function docLink(_tipo: string, id: string): string {
  return `/dashboard/concurso/${id}`;
}

type ModalAction = "suspend" | "unsuspend" | "refund" | null;

interface ActionResult {
  status: string;
  message?: string;
  amount_formatted?: string;
  amount_cents?: number;
  refund_id?: string;
  payment_intent?: string;
  plano_original?: string;
  plano_restaurado?: string;
}

export default function UserDetailClient({ data, error, accessToken, apiUrl }: Props) {
  const [action, setAction] = useState<ModalAction>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [planoOriginal, setPlanoOriginal] = useState("free");

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-900/20 p-6">
        <p className="font-medium text-red-400">Erro ao carregar dados do usuário</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl bg-slate-800 p-5">
            <div className="h-3 w-24 rounded bg-slate-700" />
            <div className="mt-3 h-4 w-48 rounded bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  const executarAcao = async (tipo: string, body?: object) => {
    setLoading(tipo);
    setResult(null);

    try {
      const endpoint = tipo === "unsuspend"
        ? `${apiUrl}/api/admin/users/${data.user_id}/unsuspend`
        : `${apiUrl}/api/admin/users/${data.user_id}/${tipo}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await res.json();
      setResult(json);

      if (res.ok) {
        // Recarrega os dados após 1s
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setResult({ status: "error", message: "Erro de conexão" });
    } finally {
      setLoading(null);
    }
  };

  const isSuspended = data.plano === "suspended";

  const InfoBlock = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-800 p-4 border border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Documentos</p>
          <p className="mt-1 text-xl font-bold text-white">{data.total_documentos}</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-4 border border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Chunks</p>
          <p className="mt-1 text-xl font-bold text-white">{data.total_chunks}</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-4 border border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Flashcards</p>
          <p className="mt-1 text-xl font-bold text-white">{data.total_flashcards}</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-4 border border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Plano</p>
          <p className="mt-1 text-xl font-bold text-white capitalize">{data.plano}</p>
        </div>
      </div>

      {/* Perfil info */}
      <div className="rounded-xl bg-slate-800 p-5 border border-slate-700">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400 mb-4">Perfil</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoBlock label="Email" value={data.email} />
          <InfoBlock label="Nome" value={data.nome || "-"} />
          <InfoBlock label="Perfil" value={data.perfil || "-"} />
          <InfoBlock label="Cadastro" value={formatDate(data.criado_em)} />
          <InfoBlock
            label="Assinatura"
            value={data.subscription ? `${data.subscription.status} (até ${formatDate(data.subscription.current_period_end)})` : "Sem assinatura ativa"}
          />
        </div>
      </div>

      {/* Ações administrativas */}
      <div className="rounded-xl bg-slate-800 p-5 border border-slate-700">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400 mb-4">
          Ações Administrativas
        </h2>
        <div className="flex flex-wrap gap-3">
          {isSuspended ? (
            <button
              onClick={() => { setAction("unsuspend"); setResult(null); }}
              disabled={loading !== null}
              className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {loading === "unsuspend" ? "Reativando..." : "Reativar usuário"}
            </button>
          ) : (
            <button
              onClick={() => { setAction("suspend"); setResult(null); }}
              disabled={loading !== null}
              className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {loading === "suspend" ? "Suspendendo..." : "Suspender usuário"}
            </button>
          )}
          <button
            onClick={() => { setAction("refund"); setResult(null); }}
            disabled={loading !== null}
            className="rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {loading === "refund" ? "Reembolsando..." : "Reembolsar último pagamento"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            result.status === "error"
              ? "bg-red-900/30 text-red-400"
              : result.status === "suspended"
              ? "bg-red-900/30 text-red-400"
              : result.status === "refunded"
              ? "bg-green-900/30 text-green-400"
              : "bg-green-900/30 text-green-400"
          }`}>
            {result.status === "suspended" && "Usuário suspenso com sucesso."}
            {result.status === "active" && "Usuário reativado com sucesso."}
            {result.status === "refunded" && (
              <>Reembolso de {result.message || result.amount_formatted || ""} processado.</>
            )}
            {result.status === "error" && `Erro: ${result.message || "Desconhecido"}`}
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-xl bg-slate-800 p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">
              {action === "suspend" && "Suspender usuário"}
              {action === "unsuspend" && "Reativar usuário"}
              {action === "refund" && "Reembolsar pagamento"}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {action === "suspend" && `Tem certeza que deseja suspender ${data.email}? O usuário perderá acesso à plataforma imediatamente.`}
              {action === "unsuspend" && `Tem certeza que deseja reativar ${data.email}? O usuário recuperará o acesso à plataforma.`}
              {action === "refund" && `Tem certeza que deseja reembolsar o último pagamento de ${data.email}? Esta ação não pode ser desfeita.`}
            </p>

            {action === "unsuspend" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Plano original
                </label>
                <select
                  value={planoOriginal}
                  onChange={(e) => setPlanoOriginal(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
                >
                  <option value="free">Free</option>
                  <option value="estudante">Estudante</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAction(null)}
                disabled={loading !== null}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (action === "suspend") executarAcao("suspend");
                  if (action === "unsuspend") executarAcao("unsuspend", { plano_original: planoOriginal });
                  if (action === "refund") executarAcao("refund");
                }}
                disabled={loading !== null}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                  action === "suspend"
                    ? "bg-red-700 hover:bg-red-600"
                    : action === "unsuspend"
                    ? "bg-green-700 hover:bg-green-600"
                    : "bg-amber-700 hover:bg-amber-600"
                } disabled:opacity-50`}
              >
                {loading === action
                  ? "Processando..."
                  : action === "suspend"
                  ? "Sim, suspender"
                  : action === "unsuspend"
                  ? "Sim, reativar"
                  : "Sim, reembolsar"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custos IA por mês */}
      {Object.keys(data.custo_ia_por_mes).length > 0 && (
        <div className="rounded-xl bg-slate-800 p-5 border border-slate-700">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400 mb-4">
            Custo de IA por Mês
          </h2>
          <div className="space-y-2">
            {Object.entries(data.custo_ia_por_mes).map(([mes, custo]) => (
              <div key={mes} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{mes}</span>
                <span className="text-sm font-medium text-white">${custo.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentos */}
      <div className="rounded-xl bg-slate-800 p-5 border border-slate-700">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400 mb-4">
          Documentos ({data.documentos.length})
        </h2>
        {data.documentos.length > 0 ? (
          <div className="space-y-2">
            {data.documentos.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg bg-slate-900/50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 truncate">{doc.nome}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tipoLabel(doc.tipo)} · {formatDate(doc.created_at)} · {formatBytes(doc.tamanho_bytes)}
                  </p>
                </div>
                <a
                  href={docLink(doc.tipo, doc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-400 hover:text-teal-300 ml-3"
                >
                  Ver →
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nenhum documento enviado.</p>
        )}
      </div>
    </div>
  );
}
