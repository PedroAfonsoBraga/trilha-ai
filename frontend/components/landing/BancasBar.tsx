"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";

const bancas = [
  { sigla: "CESPE" },
  { sigla: "CEBRASPE" },
  { sigla: "FCC" },
  { sigla: "Vunesp" },
  { sigla: "FGV" },
  { sigla: "IBFC" },
  { sigla: "Fumarc" },
  { sigla: "Idecan" },
  { sigla: "AOCP" },
  { sigla: "Quadrix" },
  { sigla: "Consulplan" },
  { sigla: "NUCEPE" },
];

export function BancasBar() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion) return;

    gsap.from(sectionRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      ease: "power2.out",
      scrollTrigger: { trigger: sectionRef.current, start: "top 90%", once: true },
    });

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const firstSet = wrapper.children[0] as HTMLElement;
    if (!firstSet) return;
    const setWidth = firstSet.offsetWidth;

    const distance = -setWidth;

    gsap.fromTo(
      wrapper,
      { x: 0 },
      {
        x: distance,
        duration: setWidth / 50,
        ease: "none",
        repeat: -1,
        onRepeat() {
          gsap.set(wrapper, { x: 0 });
        },
      }
    );
  }, { dependencies: [prefersReducedMotion], scope: sectionRef });

  return (
    <section ref={sectionRef} className="border-y border-border bg-card py-10 overflow-hidden">
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Reconhece automaticamente o padrão de cada banca
      </p>
      <div className="relative w-full overflow-hidden">
        <div ref={wrapperRef} className="flex gap-8 whitespace-nowrap w-max">
          <div className="flex gap-8">
            {bancas.map((b, i) => (
              <div key={`a-${i}`} className="flex items-center gap-2 rounded-lg bg-primary/10 px-5 py-2.5 font-semibold text-primary">
                <span className="text-lg font-bold">{b.sigla}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-8">
            {bancas.map((b, i) => (
              <div key={`b-${i}`} className="flex items-center gap-2 rounded-lg bg-primary/10 px-5 py-2.5 font-semibold text-primary">
                <span className="text-lg font-bold">{b.sigla}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-8">
            {bancas.map((b, i) => (
              <div key={`c-${i}`} className="flex items-center gap-2 rounded-lg bg-primary/10 px-5 py-2.5 font-semibold text-primary">
                <span className="text-lg font-bold">{b.sigla}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
