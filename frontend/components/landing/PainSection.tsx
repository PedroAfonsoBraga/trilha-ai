"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";

const cards = [
  { title: "Edital com 20 disciplinas e você não sabe por onde começar", desc: "O edital saiu, são dezenas de matérias, e a ansiedade toma conta antes mesmo de abrir o primeiro PDF." },
  { title: "Fichamento na mão, horas perdidas, formatação errada", desc: "Você passa mais tempo formatando no Word do que estudando. E ainda erra as normas ABNT." },
  { title: "Flashcards que você nunca termina de montar no Anki", desc: "Você sabe que revisão espaçada funciona, mas montar os cards consome um tempo que você não tem." },
];

export function PainSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion) return;
    gsap.from(titleRef.current, { opacity: 0, y: 30, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true } });
    if (cardsRef.current) {
      gsap.from(cardsRef.current.children, { opacity: 0, y: 50, duration: 0.5, stagger: 0.15, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true } });
    }
  }, { dependencies: [prefersReducedMotion], scope: sectionRef });

  return (
    <section ref={sectionRef} className="px-4 py-20 md:py-28 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        <h2 ref={titleRef} className="text-center text-3xl font-bold text-foreground md:text-4xl">Você estuda muito. Mas está estudando certo?</h2>
        <div ref={cardsRef} className="mt-14 grid gap-6 md:grid-cols-3">
          {cards.map((c, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive text-lg font-bold">!</div>
              <h3 className="text-lg font-semibold text-foreground">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
