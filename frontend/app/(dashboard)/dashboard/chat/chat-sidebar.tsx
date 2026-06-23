"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ChatSession } from "@/types/documents";

interface Profile {
  id: string;
  email: string;
  nome?: string;
  perfil?: string;
  plano?: string;
}

interface Subscription {
  plan: string;
  status: string;
  current_period_end?: string | null;
  has_portal: boolean;
}

interface Props {
  accessToken: string;
  apiUrl: string;
  sidebarOpen: boolean;
  onClose: () => void;
}

function groupSessions(sessions: ChatSession[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: { label: string; sessions: ChatSession[] }[] = [
    { label: "Hoje", sessions: [] },
    { label: "Últimos 7 dias", sessions: [] },
    { label: "Últimos 30 dias", sessions: [] },
    { label: "Anterior", sessions: [] },
  ];

  for (const s of sessions) {
    const date = new Date(s.created_at);
    if (date >= today) {
      groups[0].sessions.push(s);
    } else if (date >= sevenDaysAgo) {
      groups[1].sessions.push(s);
    } else if (date >= thirtyDaysAgo) {
      groups[2].sessions.push(s);
    } else {
      groups[3].sessions.push(s);
    }
  }

  return groups.filter((g) => g.sessions.length > 0);
}

function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: "Grátis",
    estudante: "Estudante",
    pro: "Pro",
  };
  return labels[plan] || plan;
}

export default function ChatSidebar({ accessToken, apiUrl, sidebarOpen, onClose }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSessionId = searchParams.get("s");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [sessionsRes, profileRes, subRes] = await Promise.all([
        fetch(`${apiUrl}/api/chat/sessions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }),
        fetch(`${apiUrl}/api/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }),
        fetch(`${apiUrl}/api/profile/subscription`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }),
      ]);

      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      if (profileRes.ok) setProfile(await profileRes.json());
      if (subRes.ok) setSubscription(await subRes.json());
    } catch {
      // fallback silencioso
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData, currentSessionId]);

  useEffect(() => {
    if (!subscription) return;
    if (subscription.plan !== "free") return;

    const interval = setInterval(fetchData, 10_000);
    const timeout = setTimeout(() => clearInterval(interval), 120_000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [fetchData, subscription?.plan]);

  const handleNewChat = () => {
    onClose();
    router.push("/dashboard/chat");
  };

  const handleSessionClick = (sessionId: string) => {
    onClose();
    router.push(`/dashboard/chat?s=${sessionId}`);
  };

  const grouped = groupSessions(sessions);
  const displayName = profile?.nome || profile?.email?.split("@")[0] || "Usuário";
  const planLabel = getPlanLabel(subscription?.plan || "free");
  const isFree = subscription?.plan === "free" || subscription?.status === "free";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-slate-200 bg-slate-50 transition-transform duration-200 md:relative md:z-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <span className="text-sm font-bold text-slate-900">Trilha</span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-200 md:hidden"
            aria-label="Fechar sidebar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-3 py-3">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova conversa
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-md bg-slate-200" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-slate-400">
              Nenhuma conversa ainda
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSessionClick(s.id)}
                      className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        s.id === currentSessionId
                          ? "bg-teal-100 text-teal-900 font-medium"
                          : "text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {s.titulo || "Nova conversa"}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </nav>

        <div className="border-t border-slate-200 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {displayName}
              </p>
              <p className="text-xs text-slate-500">
                {planLabel}
                {isFree && (
                  <a
                    href="/dashboard/plano"
                    className="ml-1 text-teal-600 hover:text-teal-700"
                  >
                    — Upgrade
                  </a>
                )}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
