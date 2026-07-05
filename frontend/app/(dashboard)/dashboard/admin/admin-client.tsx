"use client";

import { useState } from "react";
import { AdminStats, AdminUsersResponse } from "@/types/admin";
import AdminKpiGrid from "@/components/app/admin/admin-kpi-grid";
import AdminPlansDistribution from "@/components/app/admin/admin-plans-distribution";
import AdminCostsChart from "@/components/app/admin/admin-costs-chart";
import AdminUsersTable from "@/components/app/admin/admin-users-table";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AdminClientProps {
  stats: AdminStats | null;
  usersResponse: AdminUsersResponse | null;
  accessToken: string;
}

export default function AdminClient({ stats, usersResponse, accessToken }: AdminClientProps) {
  const [currentStats, setCurrentStats] = useState<AdminStats | null>(stats);
  const [currentUsers, setCurrentUsers] = useState<AdminUsersResponse | null>(usersResponse);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/admin/users?page=1&limit=100`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }),
      ]);

      if (statsRes.ok) {
        setCurrentStats(await statsRes.json());
      }
      if (usersRes.ok) {
        setCurrentUsers(await usersRes.json());
      }
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  if (!currentStats) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-700 font-medium">
          Erro ao carregar estatísticas administrativas.
        </p>
        <p className="text-red-500 text-sm mt-1">
          Verifique se você tem permissão de admin e tente novamente.
        </p>
        <button
          onClick={handleRefresh}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400">
          Atualizado em {lastUpdated.toLocaleTimeString("pt-BR")}
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing ? "Atualizando..." : "↻ Atualizar dados"}
        </button>
      </div>

      <AdminKpiGrid stats={currentStats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPlansDistribution distribuicao={currentStats.distribuicao_planos} />
        <AdminCostsChart stats={currentStats} />
      </div>

      {currentUsers && (
        <AdminUsersTable
          users={currentUsers.usuarios}
          total={currentUsers.total}
          accessToken={accessToken}
          apiUrl={API_URL}
        />
      )}
    </div>
  );
}
