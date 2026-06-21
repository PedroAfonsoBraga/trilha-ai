"use client";

import { useRef } from "react";
import { FileUp, ScanSearch, Download } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";

const steps = [
  { number: 1, title: "Envie o edital em PDF", desc: "Faça upload do edital em PDF. A Trilha extrai todo o conteúdo automaticamente, inclusive de scans.", icon: FileUp },
  { number: 2, title: "A Trilha analisa banca, disciplinas e pesos", desc: "Nossa IA reconhece o padrão da banca (CESPE, FCC, Vunesp) e estrutura as disciplinas com pesos reais.", icon: ScanSearch },
  { number: 3, title: "Baixe seu cronograma, fichamento e flashcards", desc: "Exporte .ics para Google Calendar, .docx em ABNT e .apkg para o Anki. Tudo pronto para usar.", icon: Download },
];

export function HowItWorksSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  useGSAP(() => {
    if (prefersReducedMotion) return;
    gsap.from(titleRef.current, { opacity: 0, y: 20, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true } });

    pathRefs.current.forEach((path) => {
      if (!path) return;
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut", scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true } });
    });

    if (stepsRef.current) {
      gsap.from(stepsRef.current.children, { opacity: 0, scale: 0.9, duration: 0.4, stagger: 0.4, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true } });
    }
    if (mockupRef.current) {
      gsap.from(mockupRef.current, { opacity: 0, y: 20, duration: 0.6, delay: 0.6, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true } });
    }
  }, { dependencies: [prefersReducedMotion], scope: sectionRef });

  return (
    <section ref={sectionRef} id="como-funciona" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 ref={titleRef} className="text-center text-3xl font-bold text-foreground md:text-4xl">Três passos. Sem complicação.</h2>
        <div ref={stepsRef} className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <step.icon className="h-8 w-8" />
                </div>
                <span className="absolute -top-4 -left-4 z-10 select-none text-7xl font-bold text-primary/10">{step.number}</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              {i < steps.length - 1 && (
                <div className="mt-6 hidden md:block">
                  <svg width="200" height="40" viewBox="0 0 200 40" className="text-muted-foreground/30">
                    <path ref={(el) => { pathRefs.current[i] = el; }} d="M10 20 L190 20" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
        <div ref={mockupRef} className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
            <div className="h-3 w-3 rounded-full bg-red-400" /><div className="h-3 w-3 rounded-full bg-yellow-400" /><div className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-2 text-xs text-muted-foreground">app.trilha.ai</span>
          </div>
          <div className="p-6">
            <div className="mb-4 h-4 w-3/4 rounded-full bg-muted" /><div className="mb-3 h-4 w-1/2 rounded-full bg-muted" /><div className="mb-6 h-4 w-5/6 rounded-full bg-muted" />
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-muted/50 p-3"><div className="mb-2 h-3 w-2/3 rounded-full bg-primary/30" /><div className="h-3 w-full rounded-full bg-muted" /></div>
              <div className="rounded-lg border border-border bg-muted/50 p-3"><div className="mb-2 h-3 w-2/3 rounded-full bg-primary/30" /><div className="h-3 w-full rounded-full bg-muted" /></div>
              <div className="rounded-lg border border-border bg-muted/50 p-3"><div className="mb-2 h-3 w-2/3 rounded-full bg-primary/30" /><div className="h-3 w-full rounded-full bg-muted" /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
