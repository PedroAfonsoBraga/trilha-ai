"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap/gsapConfig";
import { useReducedMotion } from "@/lib/gsap/useReducedMotion";
import CheckoutButton from "@/components/app/checkout-button";

interface Plan {
  nome: string; precoMensal: number; precoAnual: number; descricao: string;
  features: string[]; priceIdMensal: string | null; priceIdAnual: string | null; destaque: boolean;
}

const plans: Plan[] = [
  { nome: "Free", precoMensal: 0, precoAnual: 0, descricao: "Para começar", features: ["3 editais/mês", "5 PDFs/mês", "5 flashcards por PDF", "Export .ics e .docx"], priceIdMensal: null, priceIdAnual: null, destaque: false },
  { nome: "Estudante", precoMensal: 19.9, precoAnual: 199.9, descricao: "Para concurseiros dedicados", features: ["Tudo ilimitado", "Todos os exports", "Suporte por email"], priceIdMensal: process.env.NEXT_PUBLIC_STRIPE_ESTUDANTE_PRICE_ID ?? "price_1TeSV1JcyDCmwkxi6MP6xscY", priceIdAnual: process.env.NEXT_PUBLIC_STRIPE_ESTUDANTE_ANUAL_PRICE_ID ?? "price_1Tf8krJcyDCmwkxiXWDOxCde", destaque: true },
  { nome: "Pro", precoMensal: 39.9, precoAnual: 399.9, descricao: "Tudo incluso", features: ["Tudo do Estudante", "Concurso Assistant (chat com edital)", "Revisão espaçada integrada", "Prioridade no suporte"], priceIdMensal: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "price_1TeSV4JcyDCmwkxiIXNSXx4X", priceIdAnual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANUAL_PRICE_ID ?? "price_1Tf8ktJcyDCmwkxieFJNkRfj", destaque: false },
];

export function PricingSection() {
  const [anual, setAnual] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    if (prefersReducedMotion) return;
    gsap.from(titleRef.current, { opacity: 0, y: 20, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true } });
    if (cardsRef.current) {
      gsap.from(cardsRef.current.children, { opacity: 0, y: 30, duration: 0.5, stagger: 0.15, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true } });
    }
    const popular = cardRefs.current[1];
    if (popular) {
      gsap.from(popular, { scale: 0.95, duration: 0.4, ease: "back.out(1.7)", scrollTrigger: { trigger: popular, start: "top 85%", once: true } });
    }
  }, { dependencies: [prefersReducedMotion, anual], scope: sectionRef });

  const fmt = (v: number) => v === 0 ? "R$0" : `R$${v.toFixed(2).replace(".", ",")}`;
  const display = (p: Plan) => {
    if (p.precoMensal === 0) return "R$0";
    return anual ? `R$${(p.precoAnual / 12).toFixed(2).replace(".", ",")}` : `R$${p.precoMensal.toFixed(2).replace(".", ",")}`;
  };

  return (
    <section ref={sectionRef} id="pricing" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 ref={titleRef} className="text-center text-3xl font-bold text-foreground md:text-4xl">Escolha seu plano</h2>
        <p className="mt-4 text-center text-muted-foreground">Comece grátis e faça upgrade quando quiser</p>
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex rounded-lg border border-border bg-muted p-1">
            <button onClick={() => setAnual(false)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${!anual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Mensal</button>
            <button onClick={() => setAnual(true)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${anual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Anual</button>
          </div>
        </div>
        <div ref={cardsRef} className="mt-12 flex gap-8 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:mx-0 md:px-0 md:snap-none">
          {plans.map((plan, i) => (
            <div key={plan.nome} ref={(el) => { cardRefs.current[i] = el; }} className={`relative shrink-0 w-[85vw] max-w-[380px] snap-center rounded-xl border p-8 md:w-auto md:max-w-none md:shrink md:snap-none ${plan.destaque ? "border-primary bg-card shadow-lg ring-1 ring-primary" : "border-border bg-card"}`}>
              {plan.destaque && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">Mais popular</span>}
              <h3 className="text-lg font-semibold text-foreground">{plan.nome}</h3>
              <div className="mt-3 flex items-baseline gap-1"><span className="text-4xl font-bold text-foreground">{display(plan)}</span>{plan.precoMensal > 0 && <span className="text-sm text-muted-foreground">/mes</span>}</div>
              {anual && plan.precoMensal > 0 && <p className="mt-1 text-xs text-muted-foreground">{fmt(plan.precoAnual)} cobrado anualmente</p>}
              <p className="mt-2 text-sm text-muted-foreground">{plan.descricao}</p>
              <ul className="mt-6 space-y-3">{plan.features.map((f) => (<li key={f} className="flex items-center gap-2 text-sm text-foreground"><Check className="h-4 w-4 shrink-0 text-primary" />{f}</li>))}</ul>
              <div className="mt-8">{plan.priceIdMensal ? <CheckoutButton priceId={anual ? plan.priceIdAnual! : plan.priceIdMensal} label="Assinar agora" variant={plan.destaque ? "primary" : "outline"} /> : <Link href="/cadastro" className={`block w-full rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${plan.destaque ? "border border-primary bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border text-foreground hover:bg-muted"}`}>Começar grátis</Link>}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
