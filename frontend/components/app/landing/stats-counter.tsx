"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface Stat {
  value: number;
  prefix: string;
  suffix: string;
  label: string;
}

function AnimatedNumber({ value, prefix, suffix }: { value: number; prefix: string; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setDisplay(value.toLocaleString("pt-BR"));
      return;
    }

    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const interval = duration / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value.toLocaleString("pt-BR"));
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current).toLocaleString("pt-BR"));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isInView, value, prefersReducedMotion]);

  return (
    <span ref={ref} className="text-4xl font-bold text-primary-foreground md:text-5xl">
      {prefix}{display}{suffix}
    </span>
  );
}

const stats: Stat[] = [
  { value: 4200, prefix: "", suffix: "+", label: "editais processados" },
  { value: 38000, prefix: "", suffix: "+", label: "flashcards gerados" },
  { value: 280, prefix: "R$", suffix: "", label: "/mês economizados vs cursinho" },
];

export function StatsCounter() {
  const prefersReducedMotion = useReducedMotion();

  const sectionAnim = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 20 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" as const },
  };

  return (
    <section className="bg-primary px-4 py-16 md:py-24">
      <motion.div
        initial={sectionAnim.initial}
        whileInView={sectionAnim.whileInView}
        viewport={sectionAnim.viewport}
        transition={sectionAnim.transition}
        className="mx-auto grid max-w-5xl gap-10 text-center md:grid-cols-3"
      >
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center">
            <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
            <span className="mt-2 text-primary-foreground/80">{stat.label}</span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
