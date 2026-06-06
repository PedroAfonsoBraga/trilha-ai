"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Calendar, FileText, Layers, CalendarCheck, Brain, RefreshCw } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Cronograma inteligente",
    description: "Distribui as disciplinas por peso e data da prova automaticamente.",
  },
  {
    icon: FileText,
    title: "Fichamento ABNT",
    description: "Gera o fichamento em .docx pronto para entregar ou imprimir.",
  },
  {
    icon: Layers,
    title: "Flashcards para Anki",
    description: "Exporta .apkg real — abre direto no Anki com revisão espaçada.",
  },
  {
    icon: CalendarCheck,
    title: "Google Calendar",
    description: "Exporta .ics com todas as datas da prova e marcos do cronograma.",
  },
  {
    icon: Brain,
    title: "Entende a sua banca",
    description: "Reconhece o padrão CESPE, FCC e Vunesp. Não é um chatbot genérico.",
  },
  {
    icon: RefreshCw,
    title: "Revisão espaçada SM-2",
    description: "O mesmo algoritmo do Anki, integrado. Estude menos, retenha mais.",
  },
];

export function FeaturesSection() {
  const prefersReducedMotion = useReducedMotion();

  const containerAnim = {
    initial: prefersReducedMotion ? undefined : { opacity: 0 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { staggerChildren: 0.1 },
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
    <section id="features" className="bg-muted/30 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={titleAnim.initial}
          whileInView={titleAnim.whileInView}
          viewport={titleAnim.viewport}
          transition={titleAnim.transition}
          className="text-center text-3xl font-bold text-foreground md:text-4xl"
        >
          Tudo que você precisa
        </motion.h2>

        <motion.div
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial={containerAnim.initial}
          whileInView={containerAnim.whileInView}
          viewport={containerAnim.viewport}
          transition={containerAnim.transition}
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={cardAnim.initial}
              whileInView={cardAnim.whileInView}
              viewport={cardAnim.viewport}
              transition={cardAnim.transition}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
