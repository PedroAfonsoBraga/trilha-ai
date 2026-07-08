"use client";

interface AdminStats {
  total_usuarios: number;
  total_documentos: number;
  total_chunks: number;
  total_flashcards: number;
  total_mensagens_chat: number;
  storage_bytes: number;
  storage_gb: number;
  custo_ia_total_usd: number;
  custo_ia_mes_usd: number;
  distribuicao_planos: Record<string, number>;
}

interface Props {
  stats: AdminStats | null;
  error: string | null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accessToken: string;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function AdminDashboardContent({ stats, error, accessToken: _accessToken }: Props) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-900/20 p-6">
        <p className="font-medium text-red-400">Erro ao carregar dados</p>
        <p className="text-sm text-red-300 mt-1">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="animate-pulse rounded-xl bg-slate-800 p-5">
            <div className="h-3 w-20 rounded bg-slate-700" />
            <div className="mt-3 h-8 w-16 rounded bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="rounded-xl bg-slate-800 p-5 border border-slate-700">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Usuários" value={String(stats.total_usuarios)} />
        <StatCard label="Documentos" value={String(stats.total_documentos)} />
        <StatCard label="Chunks" value={String(stats.total_chunks)} />
        <StatCard label="Flashcards" value={String(stats.total_flashcards)} />
        <StatCard label="Mensagens Chat" value={String(stats.total_mensagens_chat)} />
        <StatCard label="Storage" value={`${stats.storage_gb} GB`} sub={formatBytes(stats.storage_bytes)} />
        <StatCard label="Custo IA (mês)" value={formatUsd(stats.custo_ia_mes_usd)} />
        <StatCard label="Custo IA (total)" value={formatUsd(stats.custo_ia_total_usd)} />
      </div>

      {/* Plan Distribution */}
      <div className="rounded-xl bg-slate-800 p-5 border border-slate-700">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400 mb-4">
          Distribuição de Planos
        </h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.distribuicao_planos).map(([plano, count]) => (
            <div
              key={plano}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                plano === "free"
                  ? "bg-slate-700 text-slate-300"
                  : plano === "estudante"
                  ? "bg-blue-900/50 text-blue-300"
                  : "bg-amber-900/50 text-amber-300"
              }`}
            >
              {plano === "estudante" ? "Estudante" : plano === "pro" ? "Pro" : "Free"}: {count}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/admin/usuarios"
          className="rounded-xl bg-slate-800 p-6 border border-slate-700 hover:border-teal-500/50 transition-all group"
        >
          <h3 className="font-semibold text-white group-hover:text-teal-400">Usuários</h3>
          <p className="mt-1.5 text-sm text-slate-400">
            Ver lista completa de usuários, uso e custos
          </p>
        </a>
        <a
          href="/admin/custos"
          className="rounded-xl bg-slate-800 p-6 border border-slate-700 hover:border-teal-500/50 transition-all group"
        >
          <h3 className="font-semibold text-white group-hover:text-teal-400">Custos de IA</h3>
          <p className="mt-1.5 text-sm text-slate-400">
            Monitoramento detalhado de uso e custo por feature/provider
          </p>
        </a>
        <a
          href="/api/admin/stats"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-slate-800 p-6 border border-slate-700 hover:border-teal-500/50 transition-all group"
        >
          <h3 className="font-semibold text-white group-hover:text-teal-400">API Raw</h3>
          <p className="mt-1.5 text-sm text-slate-400">
            Dados brutos das estatísticas (JSON)
          </p>
        </a>
      </div>
    </div>
  );
}
