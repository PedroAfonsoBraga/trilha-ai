"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, ChevronDown } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  nome: string;
  avatarUrl: string | null;
}

const pathLabels: Record<string, string> = {
  "/dashboard": "Visão Geral",
  "/dashboard/cronograma": "Cronograma",
  "/dashboard/concurso": "Concurso Assistant",
  "/dashboard/chat": "Chat",
  "/dashboard/flashcards": "Revisão Espaçada",
  "/dashboard/library": "Biblioteca",
  "/dashboard/plano": "Meu Plano",
  "/dashboard/custos": "Custos de IA",
  "/dashboard/onboarding": "Onboarding",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";
}

function getCurrentPageLabel(pathname: string): string {
  // Exact match first
  if (pathLabels[pathname]) return pathLabels[pathname];

  // Prefix match for dynamic routes
  for (const [prefix, label] of Object.entries(pathLabels)) {
    if (pathname.startsWith(prefix) && prefix !== "/dashboard") {
      return label;
    }
  }
  return "Visão Geral";
}

export default function Header({ nome, avatarUrl }: HeaderProps) {
  const pathname = usePathname();
  const currentPage = getCurrentPageLabel(pathname);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 sm:px-8">
      {/* Left: Mobile hamburger + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Hamburger — visível apenas no mobile */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] transition-colors lg:hidden"
          onClick={() => setShowMobileMenu(true)}
          aria-label="Abrir menu de navegação"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-sm font-semibold text-[#94A3B8]">Trilha</span>
          <span className="text-sm text-[#CBD5E1]">/</span>
          <span className="font-heading text-sm font-semibold text-[#1E293B]">{currentPage}</span>
        </div>
      </div>

      {/* Mobile drawer */}
      {showMobileMenu && (
        <MobileMenuDrawer
          nome={nome}
          onClose={() => setShowMobileMenu(false)}
        />
      )}

      {/* Right: Search + Notifications + Avatar */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Buscar edital, disciplina..."
            className="h-9 w-[220px] rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-sm text-[#64748B] placeholder:text-[#94A3B8] outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-mono text-[#94A3B8] lg:flex">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
          aria-label="Notificações"
        >
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* Avatar + Name */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-[#F8FAFC] transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
              {getInitials(nome)}
            </div>
            <span className="hidden text-sm font-medium text-[#1E293B] sm:block">{nome}</span>
            <ChevronDown size={16} className="hidden text-[#94A3B8] sm:block" />
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-[#E2E8F0] bg-white py-1.5 shadow-elevado">
                <a
                  href="/dashboard/plano"
                  className="block px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
                >
                  Meu Plano
                </a>
                <a
                  href="/dashboard/custos"
                  className="block px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
                >
                  Custos de IA
                </a>
                <hr className="my-1 border-[#E2E8F0]" />
                <button
                  onClick={async () => {
                    const { createClient } = await import("@/lib/supabase/client");
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Mobile Menu Drawer ─────────────────────────

function MobileMenuDrawer({
  nome,
  onClose,
}: {
  nome: string;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const menuItems = [
    { label: "Visão Geral", href: "/dashboard", icon: "🗂" },
    { label: "Cronograma", href: "/dashboard/cronograma", icon: "📅" },
    { label: "Provas Antigas", href: "/dashboard/library", icon: "📄" },
    { label: "Concurso Assistant", href: "/dashboard/concurso", icon: "🤖", badge: "Pro" },
    { label: "Desempenho", href: "/dashboard/flashcards", icon: "📊" },
  ];

  const generalItems = [
    { label: "Configurações", href: "/dashboard/plano", icon: "⚙️" },
  ];

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-[280px] bg-[#0F172A] shadow-xl lg:hidden">
        <div className="flex h-full flex-col">
          {/* Logo + Close */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-b-white/10">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4h16v4H4V4zm0 6h16v4H4v-4zm0 6h10v4H4v-4z" fill="#0D9488" />
              </svg>
              <span className="font-heading text-lg font-bold text-white">Trilha</span>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-white/10 transition-colors"
              aria-label="Fechar menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </div>

          {/* User info */}
          <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
              {getInitials(nome)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">{nome}</p>
            </div>
          </div>

          {/* Menu */}
          <nav className="mt-6 flex-1 overflow-y-auto px-4" aria-label="Navegação mobile">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
              MENU
            </p>
            <ul className="space-y-0.5">
              {menuItems.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={onClose}
                    className={`flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-all duration-150 ${
                      isActive(item.href)
                        ? "bg-teal-600/25 text-teal-400 border-l-2 border-teal-500"
                        : "text-[#64748B] hover:bg-white/5 hover:text-[#CBD5E1]"
                    }`}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-teal-600/20 px-2 py-0.5 text-[9px] font-semibold text-teal-400 uppercase">
                        {item.badge}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>

            <p className="mb-2 mt-6 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
              GERAL
            </p>
            <ul className="space-y-0.5">
              {generalItems.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={onClose}
                    className={`flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-all duration-150 ${
                      isActive(item.href)
                        ? "bg-teal-600/25 text-teal-400 border-l-2 border-teal-500"
                        : "text-[#64748B] hover:bg-white/5 hover:text-[#CBD5E1]"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                  </a>
                </li>
              ))}
              <li>
                <button
                  onClick={async () => {
                    const { createClient } = await import("@/lib/supabase/client");
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                  }}
                  className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-[#64748B] hover:bg-white/5 hover:text-[#CBD5E1] transition-all"
                >
                  <span>↩</span>
                  <span className="flex-1 text-left font-medium">Sair</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
