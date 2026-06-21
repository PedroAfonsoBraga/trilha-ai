"use client";

import { useRef } from "react";
import { CalendarDays, FileText, Brain, Calendar, Cpu, RefreshCw } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";

const features = [
  { icon: CalendarDays, title: "Cronograma inteligente", desc: "Distribui disciplinas por peso e data da prova." },
  { icon: FileText, title: "Fichamento ABNT", desc: "Gera .docx pronto para entregar ou imprimir." },
  { icon: Brain, title: "Flashcards para Anki", desc: "Exporta .apkg real. Abre direto no Anki." },
  { icon: Calendar, title: "Google Calendar", desc: "Exporta .ics com datas da prova e cronograma." },
  { icon: Cpu, title: "Entende sua banca", desc: "CESPE, FCC, Vunesp. Não é um chatbot genérico." },
  { icon: RefreshCw, title: "Revisão espaçada SM-2", desc: "Mesmo algoritmo do Anki. Estude menos, retenha mais." },
];

export function FeaturesSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    if (prefersReducedMotion) return;
    gsap.from(titleRef.current, { opacity: 0, y: 30, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true } });
    if (gridRef.current) {
      gsap.from(gridRef.current.children, { opacity: 0, y: 40, duration: 0.5, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true } });
    }
    cardRefs.current.forEach((card) => {
      if (!card) return;
      const onEnter = () => gsap.to(card, { y: -6, boxShadow: "0 10px 25px rgba(0,0,0,0.08)", duration: 0.2, ease: "power1.out" });
      const onLeave = () => gsap.to(card, { y: 0, boxShadow: "none", duration: 0.2, ease: "power1.out" });
      card.addEventListener("mouseenter", onEnter);
      card.addEventListener("mouseleave", onLeave);
    });
  }, { dependencies: [prefersReducedMotion], scope: sectionRef });

  return (
    <section ref={sectionRef} id="features" className="px-4 py-20 md:py-28 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        <h2 ref={titleRef} className="text-center text-3xl font-bold text-foreground md:text-4xl">Tudo o que você precisa em um lugar só</h2>
        <div ref={gridRef} className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} ref={(el) => { cardRefs.current[i] = el; }} className="rounded-xl border border-border bg-card p-6 transition-shadow">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><f.icon className="h-6 w-6" /></div>
              <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
