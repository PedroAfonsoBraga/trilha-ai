"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

function ParticleBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="absolute h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.3"
              className="text-muted-foreground/10"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <circle cx="10%" cy="20%" r="2" className="fill-primary/20" />
        <circle cx="85%" cy="15%" r="3" className="fill-primary/15" />
        <circle cx="70%" cy="70%" r="2" className="fill-primary/20" />
        <circle cx="25%" cy="80%" r="2.5" className="fill-primary/10" />
        <circle cx="50%" cy="50%" r="4" className="fill-primary/5" />
      </svg>
    </div>
  );
}

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  const container = {
    initial: prefersReducedMotion ? undefined : { opacity: 0 },
    animate: prefersReducedMotion ? undefined : { opacity: 1 },
    transition: prefersReducedMotion ? undefined : { staggerChildren: 0.15, delayChildren: 0.3 },
  };

  const item = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 20 },
    animate: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    transition: prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" as const },
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/50 pt-28 pb-20 md:pt-36 md:pb-28">
      <ParticleBackground />

      <motion.div
        className="relative z-10 mx-auto max-w-6xl px-4 text-center"
        initial={container.initial}
        animate={container.animate}
        transition={container.transition}
      >
        <motion.h1
          initial={item.initial}
          animate={item.animate}
          transition={item.transition}
          className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl"
        >
          Do edital ao Anki em minutos.
        </motion.h1>

        <motion.p
          initial={item.initial}
          animate={item.animate}
          transition={item.transition}
          className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          A Trilha transforma qualquer edital de concurso em cronograma,
          fichamento ABNT e flashcards prontos — automaticamente.
        </motion.p>

        <motion.div
          initial={item.initial}
          animate={item.animate}
          transition={item.transition}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/cadastro"
            className="rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Começar grátis
          </Link>
          <Link
            href="#como-funciona"
            className="rounded-lg border border-border bg-background px-8 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Ver como funciona
          </Link>
        </motion.div>

        <motion.p
          initial={item.initial}
          animate={item.animate}
          transition={item.transition}
          className="mt-8 text-sm text-muted-foreground"
        >
          Feito para CESPE, FCC, Vunesp e outras bancas
        </motion.p>
      </motion.div>
    </section>
  );
}
