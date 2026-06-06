"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    initials: "P.A.",
    role: "Aprovado AGU 2024",
    text: "Nunca pensei que montar um cronograma seria tão simples. Colei o edital e em 2 minutos tinha tudo organizado por semana.",
  },
  {
    initials: "M.S.",
    role: "Concurseira, 3ª tentativa",
    text: "O fichamento em ABNT me salvou. Antes perdia 2h por PDF.",
  },
  {
    initials: "R.C.",
    role: "Estudante de Direito",
    text: "Uso para provas da faculdade também. Os flashcards são absurdamente bons.",
  },
];

export function TestimonialsSection() {
  const prefersReducedMotion = useReducedMotion();

  const sectionAnim = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 20 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" as const },
  };

  const cardAnim = (delay: number) => ({
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 20 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.5, delay, ease: "easeOut" as const },
  });

  return (
    <section className="bg-muted/30 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.p
          initial={sectionAnim.initial}
          whileInView={sectionAnim.whileInView}
          viewport={sectionAnim.viewport}
          transition={sectionAnim.transition}
          className="text-center text-sm font-medium uppercase tracking-wider text-primary"
        >
          Beta testers
        </motion.p>
        <motion.h2
          initial={sectionAnim.initial}
          whileInView={sectionAnim.whileInView}
          viewport={sectionAnim.viewport}
          transition={sectionAnim.transition}
          className="mt-3 text-center text-3xl font-bold text-foreground md:text-4xl"
        >
          Quem usa recomenda
        </motion.h2>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {testimonials.map((t, i) => {
            const anim = cardAnim(i * 0.12);
            return (
              <motion.div
                key={i}
                initial={anim.initial}
                whileInView={anim.whileInView}
                viewport={anim.viewport}
                transition={anim.transition}
                className="rounded-xl border border-border bg-card p-6"
              >
                <Quote className="mb-4 h-5 w-5 text-primary/40" />
                <p className="text-sm leading-relaxed text-muted-foreground">{t.text}</p>
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.initials}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
