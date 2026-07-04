"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";

const testimonials = [
  { initials: "PA", name: "P.A.", subtitle: "Aprovado AGU 2024", text: "Nunca pensei que organizar meu estudo seria tão simples. Colei o edital e em 2 minutos tinha tudo por semana." },
  { initials: "MS", name: "M.S.", subtitle: "Concurseira, 3ª tentativa", text: "A análise da banca me mostrou onde eu estava desperdiçando tempo. Mudou minha forma de estudar." },
  { initials: "RC", name: "R.C.", subtitle: "Aprovado PM-BA 2024", text: "O chat com as provas antigas é absurdo. Entendi o padrão da banca em uma tarde." },
];

export function TestimonialsSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion) return;
    gsap.from(titleRef.current, { opacity: 0, y: 20, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true } });
    if (cardsRef.current) {
      gsap.from(cardsRef.current.children, { opacity: 0, x: 60, duration: 0.5, stagger: 0.15, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true } });
    }
  }, { dependencies: [prefersReducedMotion], scope: sectionRef });

  return (
    <section ref={sectionRef} className="px-4 py-20 md:py-28 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        <h2 ref={titleRef} className="text-center text-3xl font-bold text-foreground md:text-4xl">Quem usa aprova</h2>
        <p className="mt-4 text-center text-muted-foreground">Depoimentos de quem já está na Trilha</p>
        <div ref={cardsRef} className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">{t.initials}</div>
                <div><p className="font-semibold text-foreground text-sm">{t.name}</p><p className="text-xs text-muted-foreground">{t.subtitle}</p></div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{t.text}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
