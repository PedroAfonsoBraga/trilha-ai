"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Funciona com qualquer edital?",
    a: "Sim. A Trilha funciona com qualquer edital em PDF. Nossa IA analisa automaticamente a estrutura e conteúdo, independentemente da banca ou formato. Já testamos com editais do CESPE, FCC, Vunesp, FGV e IBFC.",
  },
  {
    q: "O .apkg abre mesmo no Anki oficial?",
    a: "Sim. Geramos arquivos .apkg compatíveis com o Anki Desktop (Windows, Mac, Linux) e com o AnkiDroid. É só baixar e abrir — seus flashcards já vêm configurados com revisão espaçada SM-2.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Pode sim. Não tem fidelidade nem contrato. Você pode cancelar a qualquer momento direto no Customer Portal do Stripe. Ao cancelar, você mantém o acesso até o fim do período pago.",
  },
  {
    q: "É diferente de só usar o ChatGPT?",
    a: "Totalmente. O ChatGPT é um chatbot genérico. A Trilha é uma plataforma especializada que: (1) entende o padrão específico de cada banca de concurso, (2) gera arquivos reais (.docx, .ics, .apkg), e (3) formata tudo automaticamente sem você precisar escrever prompts complexos.",
  },
  {
    q: "Meus documentos ficam salvos?",
    a: "Sim. Todos os seus editais, cronogramas, fichamentos e flashcards ficam salvos na sua conta. Você pode acessar e baixar novamente quando quiser. Seus dados são protegidos com criptografia e RLS (Row Level Security).",
  },
];

export function FaqSection() {
  const prefersReducedMotion = useReducedMotion();

  const sectionAnim = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 20 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: prefersReducedMotion ? undefined : { once: true },
    transition: prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" as const },
  };

  return (
    <section className="bg-muted/30 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-2xl">
        <motion.h2
          initial={sectionAnim.initial}
          whileInView={sectionAnim.whileInView}
          viewport={sectionAnim.viewport}
          transition={sectionAnim.transition}
          className="text-center text-3xl font-bold text-foreground md:text-4xl"
        >
          Perguntas frequentes
        </motion.h2>

        <motion.div
          initial={sectionAnim.initial}
          whileInView={sectionAnim.whileInView}
          viewport={sectionAnim.viewport}
          transition={sectionAnim.transition}
          className="mt-12"
        >
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-foreground">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">{faq.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
