import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card px-4 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M3 17c3.333-3.333 5-6 5-8 0-3-1-3-2-3S4.333 7 4 9c-.393 2.364.333 4.333 2 6" />
            <path d="M12 17c3.333-3.333 5-6 5-8 0-3-1-3-2-3s-1.667 1-2 3c-.393 2.364.333 4.333 2 6" />
            <path d="M21 17c3.333-3.333 5-6 5-8 0-3-1-3-2-3s-1.667 1-2 3c-.393 2.364.333 4.333 2 6" />
          </svg>
          <span className="text-lg font-bold text-foreground">Trilha</span>
        </div>

        <p className="text-sm text-muted-foreground">
          Trilha — Feito para quem estuda de verdade.
        </p>

        <nav className="flex items-center gap-6">
          <Link
            href="/termos"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Termos
          </Link>
          <Link
            href="/privacidade"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacidade
          </Link>
          <Link
            href="mailto:contato@trilha.ai"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Contato
          </Link>
        </nav>

        <p className="text-sm text-muted-foreground">
          Feito no Brasil 🇧🇷
        </p>
      </div>
    </footer>
  );
}
