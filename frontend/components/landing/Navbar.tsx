"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all ${scrolled ? "border-b border-border bg-background/80 backdrop-blur-md" : "bg-transparent"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M3 17c3.333-3.333 5-6 5-8 0-3-1-3-2-3S4.333 7 4 9c-.393 2.364.333 4.333 2 6" />
            <path d="M12 17c3.333-3.333 5-6 5-8 0-3-1-3-2-3s-1.667 1-2 3c-.393 2.364.333 4.333 2 6" />
            <path d="M21 17c3.333-3.333 5-6 5-8 0-3-1-3-2-3s-1.667 1-2 3c-.393 2.364.333 4.333 2 6" />
          </svg>
          Trilha
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Funcionalidades</Link>
          <Link href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Preços</Link>
          <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Entrar</Link>
          <Link href="/cadastro" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Começar grátis</Link>
        </nav>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden rounded-lg p-2 text-foreground hover:bg-muted" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4">
          <nav className="flex flex-col gap-3">
            <Link href="#features" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">Funcionalidades</Link>
            <Link href="#pricing" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">Preços</Link>
            <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">Entrar</Link>
            <Link href="/cadastro" onClick={() => setMobileOpen(false)} className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90">Começar grátis</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
