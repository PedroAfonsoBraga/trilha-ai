"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";

const rows = [
  { label: "Responde qualquer coisa, mal", trilha: "Especialista em concursos" },
  { label: "Você tem que formatar tudo", trilha: "ABNT, .docx, .apkg gerados" },
  { label: "Não conhece sua banca", trilha: "Reconhece CESPE, FCC, Vunesp" },
  { label: "Sem exportação real", trilha: "Arquivos prontos para usar" },
  { label: "R$100+/mês", trilha: "A partir de R$19,90" },
];

export function ComparisonSection() {
  const prefersReducedMotion = useReducedMotion();

  const sectionAnim = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 20 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" as const },
  };

  const rowAnim = (delay: number) => ({
    initial: prefersReducedMotion ? undefined : { opacity: 0 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.4, delay, ease: "easeOut" as const },
  });

  return (
    <section className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <motion.h2
          initial={sectionAnim.initial}
          whileInView={sectionAnim.whileInView}
          viewport={sectionAnim.viewport}
          transition={sectionAnim.transition}
          className="text-center text-3xl font-bold text-foreground md:text-4xl"
        >
          Não somos o ChatGPT
        </motion.h2>

        <motion.div
          initial={sectionAnim.initial}
          whileInView={sectionAnim.whileInView}
          viewport={sectionAnim.viewport}
          transition={sectionAnim.transition}
          className="mt-12 overflow-hidden rounded-xl border border-border"
        >
          <div className="overflow-x-auto">
            <div className="min-w-[550px] md:min-w-0">
              <div className="grid grid-cols-2 bg-muted/50 text-sm font-medium">
            <div className="flex items-center gap-2 px-6 py-3 text-muted-foreground">
              <X className="h-4 w-4 text-destructive" />
              ChatGPT / IA genérica
            </div>
            <div className="flex items-center gap-2 border-l border-border px-6 py-3 text-primary">
              <Check className="h-4 w-4" />
              Trilha
            </div>
          </div>

          {rows.map((row, i) => {
            const anim = rowAnim(i * 0.08);
            return (
              <motion.div
                key={i}
                initial={anim.initial}
                whileInView={anim.whileInView}
                viewport={anim.viewport}
                transition={anim.transition}
                className="grid grid-cols-2 border-t border-border text-sm"
              >
                <div className="flex items-center px-6 py-3 text-muted-foreground">
                  <X className="mr-3 h-4 w-4 shrink-0 text-destructive" />
                  <span>{row.label}</span>
                </div>
                <div className="flex items-center border-l border-border bg-primary/5 px-6 py-3 font-medium text-foreground">
                  <Check className="mr-3 h-4 w-4 shrink-0 text-primary" />
                  <span>{row.trilha}</span>
                </div>
              </motion.div>
            );
          })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
