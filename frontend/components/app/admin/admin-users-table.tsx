"use client";

import { useMemo, useState } from "react";
import { AdminUser, AdminUserDetail } from "@/types/admin";

interface AdminUsersTableProps {
  users: AdminUser[];
  total: number;
  accessToken: string;
  apiUrl: string;
}

const PAGE_SIZE = 10;

export default function AdminUsersTable({ users, total, accessToken, apiUrl }: AdminUsersTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(term) ||
        u.nome.toLowerCase().includes(term)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openDetail = async (user: AdminUser) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${user.user_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelected(data);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Usuários
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {total} cadastrados · mostrando {filtered.length} filtrados
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar por email ou nome..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 transition-all sm:w-64"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400">
              <th className="pb-3 font-medium">Nome</th>
              <th className="pb-3 font-medium">Plano</th>
              <th className="pb-3 font-medium text-right">Docs</th>
              <th className="pb-3 font-medium text-right">Storage (MB)</th>
              <th className="pb-3 font-medium text-right">Custo IA (USD)</th>
              <th className="pb-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((u) => (
              <tr key={u.user_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="py-3">
                  <p className="font-medium text-slate-900">{u.nome || "—"}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className="py-3">
                  <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                    {u.plano}
                  </span>
                </td>
                <td className="py-3 text-right">{u.total_documentos}</td>
                <td className="py-3 text-right">{u.storage_mb.toFixed(2)}</td>
                <td className="py-3 text-right">{u.custo_ia_mes_usd.toFixed(4)}</td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => openDetail(u)}
                    className="text-xs font-medium text-teal-600 hover:text-teal-700"
                  >
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-500">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
      )}

      {selected && (
        <UserDetailModal
          user={selected}
          onClose={() => setSelected(null)}
          loading={loadingDetail}
        />
      )}
    </div>
  );
}

function UserDetailModal({
  user,
  onClose,
  loading,
}: {
  user: AdminUserDetail;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Detalhes do usuário</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Email" value={user.email || "—"} />
              <Info label="Nome" value={user.nome || "—"} />
              <Info label="Plano" value={user.plano || "—"} />
              <Info label="Perfil" value={user.perfil || "—"} />
              <Info label="Documentos" value={user.total_documentos.toString()} />
              <Info label="Chunks" value={user.total_chunks.toString()} />
              <Info label="Flashcards" value={user.total_flashcards.toString()} />
              <Info label="Criado em" value={user.criado_em ? new Date(user.criado_em).toLocaleDateString("pt-BR") : "—"} />
            </div>

            {Object.keys(user.custo_ia_por_mes).length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-700">Custo IA por mês (USD)</h4>
                <div className="space-y-2">
                  {Object.entries(user.custo_ia_por_mes)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([mes, custo]) => (
                      <div key={mes} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-sm">
                        <span className="text-slate-600">{mes}</span>
                        <span className="font-medium text-slate-900">{custo.toFixed(4)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {user.documentos.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-700">Documentos recentes</h4>
                <ul className="space-y-1">
                  {user.documentos.slice(0, 5).map((d) => (
                    <li key={d.id} className="text-sm text-slate-600">
                      {d.nome} <span className="text-slate-400">({d.tipo})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-900">{value}</p>
    </div>
  );
}
