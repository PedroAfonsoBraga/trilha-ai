"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const faqs = [
  {
    q: "Funciona com qualquer edital?",
    a: "Sim. Basta enviar o PDF ou colar o link. A Trilha identifica automaticamente a banca e as disciplinas.",
  },
  {
    q: "Funciona para qualquer tipo de concurso?",
    a: "Sim — federal, estadual, municipal, policial, fiscal. Se tem edital, a Trilha organiza.",
  },
  {
    q: "O cronograma se adapta se eu perder um dia de estudo?",
    a: "Sim. Se você não cumprir o plano do dia, a Trilha redistribui automaticamente os tópicos restantes.",
  },
  {
    q: "O chat com provas antigas entende questões de qualquer banca?",
    a: "Sim. Você sobe o PDF da prova e discute questões e teoria diretamente. Funciona com qualquer banca.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Sem multa, sem burocracia. Cancela em um clique direto no portal do cliente.",
  },
];

export function FAQSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const accordionRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion) return;
    gsap.from(titleRef.current, { opacity: 0, y: 20, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true } });
    if (accordionRef.current) {
      const items = accordionRef.current.querySelectorAll("[data-accordion-item]");
      gsap.from(items, { opacity: 0, y: 20, stagger: 0.08, duration: 0.4, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true } });
    }
  }, { dependencies: [prefersReducedMotion], scope: sectionRef });

  return (
    <section ref={sectionRef} className="bg-muted/30 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-2xl">
        <h2 ref={titleRef} className="text-center text-3xl font-bold text-foreground md:text-4xl">Perguntas frequentes</h2>
        <div ref={accordionRef} className="mt-12">
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} data-accordion-item="">
                <AccordionTrigger className="text-left text-foreground">{faq.q}</AccordionTrigger>
                <AccordionContent><p className="text-muted-foreground">{faq.a}</p></AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
