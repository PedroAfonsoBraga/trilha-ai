"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import CheckoutButton from "@/components/app/checkout-button";

interface Plan {
  nome: string;
  precoMensal: number;
  precoAnual: number;
  descricao: string;
  features: string[];
  priceIdMensal: string | null;
  priceIdAnual: string | null;
  destaque: boolean;
}

const plans: Plan[] = [
  {
    nome: "Free",
    precoMensal: 0,
    precoAnual: 0,
    descricao: "Para começar",
    features: [
      "3 editais/mês",
      "5 PDFs/mês",
      "5 flashcards por PDF",
      "Export .ics e .docx",
    ],
    priceIdMensal: null,
    priceIdAnual: null,
    destaque: false,
  },
  {
    nome: "Estudante",
    precoMensal: 19.9,
    precoAnual: 199.9,
    descricao: "Para concurseiros dedicados",
    features: [
      "Tudo ilimitado",
      "Todos os exports",
      "Suporte por email",
    ],
    priceIdMensal: process.env.NEXT_PUBLIC_STRIPE_ESTUDANTE_PRICE_ID ?? "price_1TeSV1JcyDCmwkxi6MP6xscY",
    priceIdAnual: process.env.NEXT_PUBLIC_STRIPE_ESTUDANTE_ANUAL_PRICE_ID ?? "price_1Tf8krJcyDCmwkxiXWDOxCde",
    destaque: true,
  },
  {
    nome: "Pro",
    precoMensal: 39.9,
    precoAnual: 399.9,
    descricao: "Tudo incluso",
    features: [
      "Tudo do Estudante",
      "Concurso Assistant (chat com edital)",
      "Revisão espaçada integrada",
      "Prioridade no suporte",
    ],
    priceIdMensal: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "price_1TeSV4JcyDCmwkxiIXNSXx4X",
    priceIdAnual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANUAL_PRICE_ID ?? "price_1Tf8ktJcyDCmwkxieFJNkRfj",
    destaque: false,
  },
];

export function PricingSection() {
  const [anual, setAnual] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const sectionAnim = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 20 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" as const },
  };

  const cardAnim = (destaque: boolean) => ({
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 20, scale: 1 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: destaque ? [1, 1.02, 1] : 1 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" as const },
  });

  const formatPrice = (preco: number) => {
    if (preco === 0) return "R$0";
    return `R$${preco.toFixed(2).replace(".", ",")}`;
  };

  const getDisplayPrice = (plan: Plan) => {
    if (plan.precoMensal === 0) return "R$0";
    if (anual) {
      const mensalEquivalente = plan.precoAnual / 12;
      return `R$${mensalEquivalente.toFixed(2).replace(".", ",")}`;
    }
    return `R$${plan.precoMensal.toFixed(2).replace(".", ",")}`;
  };

  return (
    <section id="pricing" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={sectionAnim.initial}
          whileInView={sectionAnim.whileInView}
          viewport={sectionAnim.viewport}
          transition={sectionAnim.transition}
          className="text-center text-3xl font-bold text-foreground md:text-4xl"
        >
          Escolha seu plano
        </motion.h2>
        <motion.p
          initial={sectionAnim.initial}
          whileInView={sectionAnim.whileInView}
          viewport={sectionAnim.viewport}
          transition={sectionAnim.transition}
          className="mt-4 text-center text-muted-foreground"
        >
          Comece grátis e faça upgrade quando quiser
        </motion.p>

        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex rounded-lg border border-border bg-muted p-1">
            <button
              onClick={() => setAnual(false)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                !anual
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnual(true)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                anual
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        <div className="mt-12 flex gap-8 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:mx-0 md:px-0 md:snap-none">
          {plans.map((plan) => {
            const anim = cardAnim(plan.destaque);
            return (
              <motion.div
                key={plan.nome}
                initial={anim.initial}
                whileInView={anim.whileInView}
                viewport={anim.viewport}
                transition={anim.transition}
                className={`relative shrink-0 w-[85vw] max-w-[380px] snap-center rounded-xl border p-8 md:w-auto md:max-w-none md:shrink md:snap-none ${
                  plan.destaque
                    ? "border-primary bg-card shadow-lg ring-1 ring-primary"
                    : "border-border bg-card"
                }`}
              >
                {plan.destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Mais popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-foreground">{plan.nome}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {getDisplayPrice(plan)}
                  </span>
                  {plan.precoMensal > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {anual ? "/mes" : "/mes"}
                    </span>
                  )}
                </div>
                {anual && plan.precoMensal > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPrice(plan.precoAnual)} cobrado anualmente
                  </p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">{plan.descricao}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {plan.priceIdMensal ? (
                    <CheckoutButton
                      priceId={anual ? plan.priceIdAnual! : plan.priceIdMensal}
                      label="Assinar agora"
                      variant={plan.destaque ? "primary" : "outline"}
                    />
                  ) : (
                    <Link
                      href="/cadastro"
                      className={`block w-full rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
                        plan.destaque
                          ? "border border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      Começar grátis
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
