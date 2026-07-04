"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";

const counters = [
  { value: 4200, prefix: "", suffix: "+", label: "editais processados" },
  { value: 38000, prefix: "", suffix: "+", label: "horas de estudo organizadas" },
  { value: 280, prefix: "R$", suffix: "/mês", label: "economizados vs cursinho presencial" },
];

export function CounterSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const counterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useGSAP(() => {
    if (prefersReducedMotion) return;
    counterRefs.current.forEach((el, i) => {
      if (!el) return;
      const c = counters[i];
      gsap.to(el, {
        innerHTML: c.value,
        duration: 1.8,
        ease: "power1.out",
        snap: { innerHTML: 1 },
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true },
        onUpdate: function () {
          const val = Math.round(parseFloat(el.innerHTML) || 0);
          el.innerHTML = `${c.prefix}${val.toLocaleString("pt-BR")}${c.suffix}`;
        },
      });
    });
  }, { dependencies: [prefersReducedMotion], scope: sectionRef });

  return (
    <section ref={sectionRef} className="px-4 py-16 md:py-20 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 text-center md:grid-cols-3">
          {counters.map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <span ref={(el) => { counterRefs.current[i] = el; }} className="text-4xl font-bold md:text-5xl">0</span>
              <span className="text-sm opacity-80">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
