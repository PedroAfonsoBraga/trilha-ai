"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";

export function CTASection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true } });
    tl.from(titleRef.current, { opacity: 0, y: 30, duration: 0.5 })
      .from(subRef.current, { opacity: 0, y: 20, duration: 0.4 }, "-=0.2")
      .from(btnRef.current, { opacity: 0, scale: 0.9, duration: 0.3 }, "-=0.1");
  }, { dependencies: [prefersReducedMotion], scope: sectionRef });

  return (
    <section ref={sectionRef} className="bg-primary px-4 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 ref={titleRef} className="text-3xl font-bold text-primary-foreground md:text-4xl">Sua aprovação começa com o primeiro edital.</h2>
        <p ref={subRef} className="mt-4 text-primary-foreground/80">Grátis para começar. Sem cartão de crédito.</p>
        <div ref={btnRef} className="mt-8">
          <Link href="/cadastro" className="inline-block rounded-lg bg-white px-10 py-4 text-base font-semibold text-primary shadow-lg transition-colors hover:bg-white/90">Criar conta grátis</Link>
        </div>
      </div>
    </section>
  );
}
