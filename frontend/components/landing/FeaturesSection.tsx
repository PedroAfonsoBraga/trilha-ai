"use client";

import { useRef } from "react";
import { CalendarDays, ScanSearch, Calendar, MessageSquareText, Sparkles, TrendingUp } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";

const features = [
  { icon: CalendarDays, title: "Cronograma inteligente", desc: "Distribui as disciplinas por peso e data da prova. Reorganiza automaticamente se você perder um dia.", pro: false },
  { icon: ScanSearch, title: "Identificação de banca", desc: "CESPE, FCC, Vunesp e mais. A Trilha conhece o estilo de cada uma e adapta seu plano.", pro: false },
  { icon: Calendar, title: "Google Calendar", desc: "Exporta .ics com todas as datas e marcos do seu cronograma. Estuda onde já organiza sua vida.", pro: false },
  { icon: MessageSquareText, title: "Chat com provas antigas", desc: "Sobe uma prova anterior e tire dúvidas sobre questões e teoria diretamente com a IA.", pro: false },
  { icon: Sparkles, title: "Concurso Assistant (Pro)", desc: "Chat direto com seu edital. Tire dúvidas específicas sobre regras, vagas e critérios da sua prova.", pro: true },
  { icon: TrendingUp, title: "Análise de padrão da banca (Pro)", desc: "Cruzamos provas antigas com seu edital atual. Você sabe exatamente o que a banca mais cobra.", pro: true },
];

export function FeaturesSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion) return;
    gsap.from(titleRef.current, { opacity: 0, y: 30, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true } });
    if (gridRef.current) {
      gsap.from(gridRef.current.children, { opacity: 0, y: 40, duration: 0.5, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true } });
    }
  }, { dependencies: [prefersReducedMotion], scope: sectionRef });

  return (
    <section ref={sectionRef} id="features" className="px-4 py-20 md:py-28 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        <h2 ref={titleRef} className="text-center text-3xl font-bold text-foreground md:text-4xl">Tudo que você precisa para chegar lá.</h2>
        <p className="mt-4 text-center text-muted-foreground">Sem planilha. Sem achismo. Sem perder tempo.</p>
        <div ref={gridRef} className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><f.icon className="h-6 w-6" /></div>
              <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              {f.pro && <span className="mt-3 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pro</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
