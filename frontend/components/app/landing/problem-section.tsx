"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, FileText, Layers } from "lucide-react";

const problems = [
  {
    icon: BookOpen,
    text: "Edital com 20 disciplinas e você não sabe por onde começar",
  },
  {
    icon: FileText,
    text: "Fichamento na mão, horas perdidas, formatação errada",
  },
  {
    icon: Layers,
    text: "Flashcards que você nunca termina de montar no Anki",
  },
];

export function ProblemSection() {
  const prefersReducedMotion = useReducedMotion();

  const containerAnim = {
    initial: prefersReducedMotion ? undefined : { opacity: 0 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { staggerChildren: 0.15 },
  };

  const cardAnim = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 20 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.5, ease: "easeOut" as const },
  };

  const titleAnim = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 20 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.5, ease: "easeOut" as const },
  };

  return (
    <section className="bg-muted/30 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={titleAnim.initial}
          whileInView={titleAnim.whileInView}
          viewport={titleAnim.viewport}
          transition={titleAnim.transition}
          className="text-center text-3xl font-bold text-foreground md:text-4xl"
        >
          Você estuda muito. Mas está estudando certo?
        </motion.h2>

        <motion.div
          className="mt-12 grid gap-6 md:grid-cols-3"
          initial={containerAnim.initial}
          whileInView={containerAnim.whileInView}
          viewport={containerAnim.viewport}
          transition={containerAnim.transition}
        >
          {problems.map((problem, i) => (
            <motion.div
              key={i}
              initial={cardAnim.initial}
              whileInView={cardAnim.whileInView}
              viewport={cardAnim.viewport}
              transition={cardAnim.transition}
              className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <problem.icon className="h-6 w-6 text-primary" />
              </div>
              <p className="text-foreground">{problem.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
