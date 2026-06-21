"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLParagraphElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion) return;
    const tl = gsap.timeline({ delay: 0.4 });
    tl.from(badgeRef.current, { opacity: 0, y: 20, duration: 0.4 })
      .from(h1Ref.current, { opacity: 0, y: 30, duration: 0.6 }, "-=0.2")
      .from(subRef.current, { opacity: 0, y: 20, duration: 0.5 }, "-=0.3")
      .from(ctaRef.current, { opacity: 0, y: 20, duration: 0.4 }, "-=0.2");
  }, { dependencies: [prefersReducedMotion], scope: sectionRef });

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/50 pt-28 pb-20 md:pt-36 md:pb-28">
      <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
        <p ref={badgeRef} className="inline-block rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground">
          Feito para CESPE, FCC, Vunesp e outras bancas
        </p>
        <h1 ref={h1Ref} className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Do edital ao Anki em minutos.
        </h1>
        <p ref={subRef} className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          A Trilha transforma qualquer edital de concurso em cronograma, fichamento ABNT e flashcards prontos — automaticamente.
        </p>
        <div ref={ctaRef} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/cadastro" className="rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90">Começar grátis</Link>
          <Link href="#como-funciona" className="rounded-lg border border-border bg-background px-8 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted">Ver como funciona</Link>
        </div>
      </div>
    </section>
  );
}
