"use client";

import { useState } from "react";

interface Usuario {
  user_id: string;
  email: string;
  nome: string;
  plano: string;
  perfil: string;
  total_documentos: number;
  storage_bytes: number;
  storage_mb: number;
  custo_ia_mes_usd: number;
  ultimo_acesso: string | null;
  criado_em: string | null;
}

interface UsuariosResponse {
  usuarios: Usuario[];
  total: number;
  page: number;
  limit: number;
}

interface Props {
  accessToken: string;
  initialData: UsuariosResponse | null;
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

function planBadge(plano: string): string {
  switch (plano) {
    case "pro":
      return "bg-amber-900/50 text-amber-300";
    case "estudante":
      return "bg-blue-900/50 text-blue-300";
    default:
      return "bg-slate-700 text-slate-300";
  }
}

function planLabel(plano: string): string {
  switch (plano) {
    case "pro":
      return "Pro";
    case "estudante":
      return "Estudante";
    default:
      return "Free";
  }
}

export default function UsuariosClient({ accessToken, initialData, apiUrl }: Props) {
  const [search, setSearch] = useState("");
  const [data, setData] = useState(initialData);

  const handleSearch = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/users?limit=50&search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Buscar por email ou nome..."
          className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
        />
        <button
          onClick={handleSearch}
          className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          Buscar
        </button>
      </div>

      {/* Table */}
      {data && data.usuarios.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3 text-right">Docs</th>
                <th className="px-4 py-3 text-right">Storage</th>
                <th className="px-4 py-3 text-right">Custo IA/mês</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {data.usuarios.map((u) => (
                <tr key={u.user_id} className="bg-slate-900/50 hover:bg-slate-800 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-slate-300">{u.nome || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${planBadge(u.plano)}`}>
                      {planLabel(u.plano)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">{u.total_documentos}</td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {u.storage_mb > 0 ? `${u.storage_mb} MB` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {u.custo_ia_mes_usd > 0 ? `$${u.custo_ia_mes_usd.toFixed(4)}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(u.criado_em)}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/usuarios/${u.user_id}`}
                      className="text-teal-400 hover:text-teal-300 text-xs font-medium"
                    >
                      Detalhes →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/50 px-8 py-12 text-center">
          <p className="text-slate-400">Nenhum usuário encontrado.</p>
        </div>
      )}
    </div>
  );
}
