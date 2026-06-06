"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export function CtaFinalSection() {
  const prefersReducedMotion = useReducedMotion();

  const sectionAnim = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 20 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" as const },
  };

  const pulseAnim = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, scale: [1, 1.03, 1] },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.8, ease: "easeOut" as const },
  };

  return (
    <section className="bg-primary px-4 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <motion.h2
          initial={sectionAnim.initial}
          whileInView={sectionAnim.whileInView}
          viewport={sectionAnim.viewport}
          transition={sectionAnim.transition}
          className="text-3xl font-bold text-primary-foreground md:text-4xl"
        >
          Sua aprovação começa com o primeiro edital.
        </motion.h2>
        <motion.p
          initial={sectionAnim.initial}
          whileInView={sectionAnim.whileInView}
          viewport={sectionAnim.viewport}
          transition={sectionAnim.transition}
          className="mt-4 text-primary-foreground/80"
        >
          Grátis para começar. Sem cartão de crédito.
        </motion.p>
        <motion.div
          initial={pulseAnim.initial}
          whileInView={pulseAnim.whileInView}
          viewport={pulseAnim.viewport}
          transition={pulseAnim.transition}
          className="mt-8"
        >
          <Link
            href="/cadastro"
            className="inline-block rounded-lg bg-white px-10 py-4 text-base font-semibold text-primary shadow-lg transition-colors hover:bg-white/90"
          >
            Criar conta grátis
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
