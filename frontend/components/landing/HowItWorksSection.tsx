"use client";

import { useRef } from "react";
import { FileUp, ScanSearch, Compass } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";

const steps = [
  {
    number: 1,
    title: "Envie o edital",
    desc: "Cole o link ou faça upload do PDF. Qualquer edital, qualquer banca.",
    icon: FileUp,
  },
  {
    number: 2,
    title: "A Trilha analisa",
    desc: "Identificamos banca, disciplinas, pesos e datas automaticamente.",
    icon: ScanSearch,
  },
  {
    number: 3,
    title: "Siga o GPS",
    desc: "Cronograma personalizado, acompanhamento de progresso e guia até a prova.",
    icon: Compass,
  },
];

export function HowItWorksSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  useGSAP(
    () => {
      if (prefersReducedMotion) return;
      gsap.from(titleRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          once: true,
        },
      });

      pathRefs.current.forEach((path) => {
        if (!path) return;
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(path, {
          strokeDashoffset: 0,
          duration: 1.5,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            once: true,
          },
        });
      });

      if (stepsRef.current) {
        gsap.from(stepsRef.current.children, {
          opacity: 0,
          scale: 0.9,
          duration: 0.4,
          stagger: 0.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            once: true,
          },
        });
      }
    },
    { dependencies: [prefersReducedMotion], scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="como-funciona"
      className="px-4 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          ref={titleRef}
          className="text-center text-3xl font-bold text-foreground md:text-4xl"
        >
          Três passos. Sem complicação.
        </h2>
        <div ref={stepsRef} className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative mb-6">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <step.icon className="h-8 w-8" />
                </div>
                <span className="absolute -top-4 -left-4 z-10 select-none text-7xl font-bold text-primary/10">
                  {step.number}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {step.desc}
              </p>
              {i < steps.length - 1 && (
                <div className="mt-6 hidden md:block">
                  <svg
                    width="200"
                    height="40"
                    viewBox="0 0 200 40"
                    className="text-muted-foreground/30"
                  >
                    <path
                      ref={(el) => {
                        pathRefs.current[i] = el;
                      }}
                      d="M10 20 L190 20"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="5 5"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
