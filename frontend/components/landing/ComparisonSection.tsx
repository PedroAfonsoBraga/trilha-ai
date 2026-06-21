"use client";

import { useRef } from "react";
import { Check, X } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";

const rows = [
  { label: "Especialista em concursos", generic: "Responde qualquer coisa, mal", trilha: "Foco total em concurso público" },
  { label: "Formatação automática", generic: "Você formata tudo", trilha: "ABNT, .docx, .apkg gerados" },
  { label: "Reconhece sua banca", generic: "Não conhece sua banca", trilha: "Reconhece CESPE, FCC, Vunesp" },
  { label: "Exportação real", generic: "Sem exportação real", trilha: "Arquivos prontos para usar" },
  { label: "Preço", generic: "R$100+/mês", trilha: "A partir de R$19,90" },
];

export function ComparisonSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const colLeftRef = useRef<HTMLDivElement>(null);
  const colRightRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion) return;
    gsap.from(titleRef.current, { opacity: 0, y: 20, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true } });
    gsap.from([colLeftRef.current, colRightRef.current], { opacity: 0, x: (i) => i === 0 ? -40 : 40, duration: 0.6, stagger: 0.15, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true } });
  }, { dependencies: [prefersReducedMotion], scope: sectionRef });

  return (
    <section ref={sectionRef} className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-4xl">
        <h2 ref={titleRef} className="text-center text-3xl font-bold text-foreground md:text-4xl">Não somos o ChatGPT</h2>
        <p className="mt-4 text-center text-muted-foreground">Comparação honesta entre usar uma IA genérica e a Trilha</p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div ref={colLeftRef} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-6"><h3 className="text-lg font-semibold text-foreground">ChatGPT / IA Genérica</h3></div>
            <ul className="space-y-7">
              {rows.map((r, i) => (
                <li key={i} className="flex items-start gap-3"><X className="h-5 w-5 shrink-0 mt-0.5 text-destructive" /><span className="text-sm text-muted-foreground">{r.generic}</span></li>
              ))}
            </ul>
          </div>
          <div ref={colRightRef} className="rounded-xl border-2 border-primary bg-card p-6 ring-1 ring-primary/20">
            <div className="flex items-center gap-2 mb-6"><h3 className="text-lg font-semibold text-foreground">Trilha</h3></div>
            <ul className="space-y-7">
              {rows.map((r, i) => (
                <li key={i} className="flex items-start gap-3"><Check className="h-5 w-5 shrink-0 mt-0.5 text-success" /><span className="text-sm text-foreground">{r.trilha}</span></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 md:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="text-left py-3 pr-4 text-foreground font-semibold">Comparação</th><th className="text-center py-3 px-4 text-muted-foreground">ChatGPT</th><th className="text-center py-3 pl-4 text-primary font-semibold">Trilha</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 pr-4 text-foreground">{r.label}</td>
                    <td className="text-center py-3 px-4"><X className="h-4 w-4 mx-auto text-destructive" /></td>
                    <td className="text-center py-3 pl-4"><Check className="h-4 w-4 mx-auto text-success" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
