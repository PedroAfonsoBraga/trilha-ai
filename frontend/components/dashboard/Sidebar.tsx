"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Bot,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  nome: string;
  plano: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const menuItems: NavItem[] = [
  { label: "Visão Geral", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Cronograma", href: "/dashboard/cronograma", icon: <Calendar size={18} /> },
  { label: "Provas Antigas", href: "/dashboard/library", icon: <FileText size={18} /> },
  { label: "Concurso Assistant", href: "/dashboard/concurso", icon: <Bot size={18} />, badge: "Pro" },
  { label: "Desempenho", href: "/dashboard/flashcards", icon: <BarChart3 size={18} /> },
];

const generalItems: NavItem[] = [
  { label: "Configurações", href: "/dashboard/plano", icon: <Settings size={18} /> },
  { label: "Ajuda", href: "#", icon: <HelpCircle size={18} /> },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";
}

function getPlanLabel(plano: string): string {
  switch (plano) {
    case "pro": return "Pro";
    case "estudante": return "Estudante";
    default: return "Free";
  }
}

export default function Sidebar({ nome, plano }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleNavigation = (href: string) => {
    if (href === "#") return;
    router.push(href);
  };

  const isActive = (href: string): boolean => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      aria-label="Navegação principal"
      className="fixed left-0 top-0 z-30 hidden h-full w-[240px] flex-col bg-[#0F172A] border-r border-r-white/10 lg:flex"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 pt-6 pb-5 border-b border-b-white/10">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4h16v4H4V4zm0 6h16v4H4v-4zm0 6h10v4H4v-4z" fill="#0D9488" />
        </svg>
        <span className="font-heading text-lg font-bold text-white">Trilha</span>
      </div>

      {/* User Card */}
      <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
          {getInitials(nome)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-white">{nome}</p>
          <span className="inline-block rounded-full bg-teal-600/20 px-2 py-0.5 text-[10px] font-semibold text-teal-400 uppercase leading-tight">
            {getPlanLabel(plano)}
          </span>
        </div>
      </div>

      {/* Menu Section */}
      <nav className="mt-6 flex-1 overflow-y-auto px-4" aria-label="Menu principal">
        <p className="label mb-2 px-2 text-[#475569]">MENU</p>
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.label}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm transition-all duration-150 ${
                    active
                      ? "bg-teal-600/25 text-teal-400 border-l-2 border-teal-500"
                      : "text-[#64748B] hover:bg-white/5 hover:text-[#CBD5E1]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-teal-600/20 px-2 py-0.5 text-[9px] font-semibold text-teal-400 uppercase">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* General Section */}
        <p className="label mb-2 mt-6 px-2 text-[#475569]">GERAL</p>
        <ul className="space-y-0.5">
          {generalItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.label}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm transition-all duration-150 ${
                    active
                      ? "bg-teal-600/25 text-teal-400 border-l-2 border-teal-500"
                      : "text-[#64748B] hover:bg-white/5 hover:text-[#CBD5E1]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
          {/* Logout */}
          <li>
            <button
              onClick={handleLogout}
              className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-[#64748B] transition-all duration-150 hover:bg-white/5 hover:text-[#CBD5E1]"
            >
              <span className="shrink-0"><LogOut size={18} /></span>
              <span className="flex-1 text-left font-medium">Sair</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
