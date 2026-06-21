Contexto geral
Você vai construir a landing page completa da "Trilha" — plataforma de 
estudos para concursos públicos. O projeto usa Next.js 14 (App Router), 
TypeScript estrito, Tailwind CSS e shadcn/ui.

Antes de qualquer coisa, leia:
1. CLAUDE.md
2. frontend/CLAUDE.md
3. docs/learnings/session-notes.md

---

Stack de animação obrigatória

Instale as seguintes dependências:
npm install gsap @types/gsap three @types/three @gsap/react

Bibliotecas PROIBIDAS para animação neste projeto:
- Framer Motion
- AOS
- Animate.css
- GSAP premium (uso apenas da versão free/public)

Regra geral de animação:
- Todas as animações de scroll usam GSAP ScrollTrigger
- Efeitos de background 3D usam Three.js
- Micro-interações (hover, click) usam GSAP simples
- Respeitar obrigatoriamente prefers-reduced-motion
- Nunca usar animações infinitas em elementos grandes
- viewport: animar apenas uma vez (scrub: false, once: true)

---

Paleta de cores — obrigatória

Primary:    #0D9488
Background: #F8FAFC
Text:       #1E293B
Border:     #E2E8F0
Success:    #059669
Muted:      #64748B

---

Arquitetura de arquivos

frontend/
├── app/
│   └── (marketing)/
│       └── page.tsx                    ← página principal (importa seções)
├── components/
│   └── landing/
│       ├── Navbar.tsx
│       ├── HeroSection.tsx             ← Three.js aqui
│       ├── BancasBar.tsx
│       ├── PainSection.tsx
│       ├── HowItWorksSection.tsx       ← SVG path animation GSAP
│       ├── FeaturesSection.tsx
│       ├── ComparisonSection.tsx
│       ├── CounterSection.tsx          ← countUp GSAP
│       ├── TestimonialsSection.tsx
│       ├── PricingSection.tsx
│       ├── FAQSection.tsx
│       └── CTASection.tsx
└── lib/
    └── gsap/
        ├── gsapConfig.ts               ← registro de plugins
        └── useReducedMotion.ts         ← hook de acessibilidade

---

Configuração GSAP — gsapConfig.ts

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TextPlugin } from 'gsap/TextPlugin'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, TextPlugin)
}

export { gsap, ScrollTrigger }

---

Hook de acessibilidade — useReducedMotion.ts

Crie um hook que:
- Detecta prefers-reduced-motion via window.matchMedia
- Retorna boolean: prefersReducedMotion
- Usado em todos os componentes com animação:

  const prefersReducedMotion = useReducedMotion()
  if (!prefersReducedMotion) {
    gsap.from(...)
  }

---

Regras de uso do GSAP

Padrão de entrada com ScrollTrigger:
  gsap.from(element, {
    opacity: 0,
    y: 40,
    duration: 0.6,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: element,
      start: 'top 85%',
      once: true,
    }
  })

Stagger em listas:
  gsap.from(items, {
    opacity: 0,
    y: 30,
    duration: 0.5,
    ease: 'power2.out',
    stagger: 0.1,
    scrollTrigger: { trigger: container, start: 'top 80%', once: true }
  })

Micro-interação hover (botões):
  element.addEventListener('mouseenter', () =>
    gsap.to(element, { scale: 1.03, duration: 0.15, ease: 'power1.out' })
  )
  element.addEventListener('mouseleave', () =>
    gsap.to(element, { scale: 1, duration: 0.15, ease: 'power1.out' })
  )

Limpeza obrigatória de ScrollTrigger em useEffect:
  return () => {
    ScrollTrigger.getAll().forEach(t => t.kill())
  }

---

Three.js — Hero Section

Crie uma cena 3D no background do Hero com as seguintes specs:

Cena:
- Canvas full-width atrás do conteúdo (position: absolute, z-index: 0)
- Conteúdo do hero em z-index: 10 por cima do canvas
- Background da cena: transparente (alpha: true no renderer)

Geometria:
- 120 nós (SphereGeometry, radius 0.06) espalhados aleatoriamente
  no espaço 3D (x: -8 a 8, y: -5 a 5, z: -5 a 5)
- Cor dos nós: #0D9488 (primary teal)
- Conectar nós próximos (distância < 2.5) com LineSegments
- Cor das linhas: #0D9488 com opacity 0.2

Animação da cena:
- Rotação suave da cena inteira: rotation.y += 0.0008 por frame
- Leve oscilação: rotation.x = Math.sin(Date.now() * 0.0003) * 0.08
- Mouse parallax suave:
    targetX = (mouseX / window.innerWidth - 0.5) * 0.3
    targetY = (mouseY / window.innerHeight - 0.5) * 0.2
    camera.position.x += (targetX - camera.position.x) * 0.05
    camera.position.y += (-targetY - camera.position.y) * 0.05

Performance:
- Usar requestAnimationFrame com cleanup no unmount
- Resize handler com debounce de 100ms
- Limitar a 60fps com clock.getDelta()
- Se prefersReducedMotion: parar animação, manter cena estática

Código base para o componente Three.js:
  'use client'
  import { useEffect, useRef } from 'react'
  import * as THREE from 'three'

  export function HeroCanvas() {
    const mountRef = useRef<HTMLDivElement>(null)
    
    useEffect(() => {
      // setup scene, camera, renderer
      // criar nós e conexões
      // animate loop
      // cleanup: renderer.dispose(), cancelAnimationFrame
    }, [])

    return (
      <div 
        ref={mountRef} 
        className="absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      />
    )
  }

---

Estrutura das seções — conteúdo e animações

1. Navbar
Conteúdo:
  - Logo "Trilha" à esquerda
  - Links: Funcionalidades | Preços | Entrar
  - CTA: "Começar grátis" (bg teal)
  - Sticky com backdrop-blur

Animação GSAP:
  gsap.from(navbar, {
    y: -60, opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.2
  })

---

2. Hero Section
Conteúdo:
  Headline: "Do edital ao Anki em minutos."
  Subheadline: "A Trilha transforma qualquer edital de concurso em
  cronograma, fichamento ABNT e flashcards prontos — automaticamente."
  CTA primário: "Começar grátis" → /cadastro
  CTA secundário: "Ver como funciona" → #como-funciona
  Badge: "Feito para CESPE · FCC · Vunesp"
  Background: HeroCanvas (Three.js)

Animação GSAP — stagger em sequência:
  const tl = gsap.timeline({ delay: 0.4 })
  tl.from(badge,       { opacity: 0, y: 20, duration: 0.4 })
    .from(headline,    { opacity: 0, y: 30, duration: 0.6 }, '-=0.2')
    .from(subheadline, { opacity: 0, y: 20, duration: 0.5 }, '-=0.3')
    .from(ctaGroup,    { opacity: 0, y: 20, duration: 0.4 }, '-=0.2')

---

3. Barra de Bancas
Conteúdo: CESPE · CEBRASPE · FCC · Vunesp · FGV · IBFC
  Texto: "Reconhece automaticamente o padrão de cada banca"

Animação GSAP — marquee horizontal infinito:
  gsap.to(track, {
    x: '-50%',
    duration: 20,
    ease: 'none',
    repeat: -1,
  })
  // duplicar os items no DOM para loop contínuo

---

4. Seção "O Problema"
Conteúdo:
  Título: "Você estuda muito. Mas está estudando certo?"
  3 cards:
  - "Edital com 20 disciplinas e você não sabe por onde começar"
  - "Fichamento na mão, horas perdidas, formatação errada"
  - "Flashcards que você nunca termina de montar no Anki"

Animação GSAP — stagger de cards:
  gsap.from(cards, {
    opacity: 0, y: 50, duration: 0.5, stagger: 0.15, ease: 'power2.out',
    scrollTrigger: { trigger: section, start: 'top 80%', once: true }
  })

---

5. Como Funciona — id="como-funciona"
Conteúdo:
  Título: "Três passos. Sem complicação."
  Passo 1: Envie o edital em PDF
  Passo 2: A Trilha analisa banca, disciplinas e pesos
  Passo 3: Baixe seu cronograma, fichamento e flashcards

Animação GSAP — SVG path sendo desenhado ao rolar:
  Criar um SVG com um path conectando os 3 passos (linha pontilhada).
  
  const path = document.querySelector('#connection-path')
  const length = path.getTotalLength()
  
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
  gsap.to(path, {
    strokeDashoffset: 0,
    duration: 1.5,
    ease: 'power2.inOut',
    scrollTrigger: { trigger: section, start: 'top 70%', once: true }
  })

  Cada passo entra com fade após o trecho da linha chegar:
  gsap.from(steps, {
    opacity: 0, scale: 0.9, duration: 0.4, stagger: 0.4,
    scrollTrigger: { trigger: section, start: 'top 70%', once: true }
  })

---

6. Features
Conteúdo — grid 2x3:
  🗓️ Cronograma inteligente — "Distribui disciplinas por peso e data da prova."
  📄 Fichamento ABNT — "Gera .docx pronto para entregar ou imprimir."
  🃏 Flashcards para Anki — "Exporta .apkg real. Abre direto no Anki."
  📅 Google Calendar — "Exporta .ics com datas da prova e cronograma."
  🤖 Entende sua banca — "CESPE, FCC, Vunesp. Não é um chatbot genérico."
  🔁 Revisão espaçada SM-2 — "Mesmo algoritmo do Anki. Estude menos, retenha mais."

Animação GSAP:
  - Stagger de entrada dos cards (y: 40, opacity: 0)
  - Hover: gsap.to(card, { y: -6, boxShadow: '...', duration: 0.2 })
  - Leave: gsap.to(card, { y: 0, boxShadow: 'none', duration: 0.2 })

---

7. Comparativo — "Não somos o ChatGPT"
Conteúdo — tabela 2 colunas:
  ChatGPT / IA Genérica  |  Trilha
  Responde qualquer coisa, mal | Especialista em concursos
  Você formata tudo | ABNT, .docx, .apkg gerados
  Não conhece sua banca | Reconhece CESPE, FCC, Vunesp
  Sem exportação real | Arquivos prontos para usar
  R$100+/mês | A partir de R$19,90

  Coluna Trilha: borda teal, ✓ em verde
  Coluna genérica: cinza, ✗ em vermelho

Animação GSAP:
  gsap.from([colLeft, colRight], {
    opacity: 0, x: (i) => i === 0 ? -40 : 40,
    duration: 0.6, stagger: 0.15, ease: 'power2.out',
    scrollTrigger: { trigger: section, start: 'top 80%', once: true }
  })

---

8. Contadores
Conteúdo:
  4.200+ editais processados
  38.000+ flashcards gerados
  R$280/mês economizados vs cursinho

Animação GSAP — countUp ao entrar na viewport:
  ScrollTrigger.create({
    trigger: counterSection,
    start: 'top 80%',
    once: true,
    onEnter: () => {
      counters.forEach(counter => {
        gsap.to(counter, {
          innerHTML: targetValue,
          duration: 1.8,
          ease: 'power1.out',
          snap: { innerHTML: 1 },
          onUpdate: () => {
            counter.innerHTML = Math.round(counter.innerHTML).toLocaleString('pt-BR')
          }
        })
      })
    }
  })

---

9. Depoimentos
Conteúdo:
  "P.A. — Aprovado AGU 2024"
  "Nunca pensei que montar um cronograma seria tão simples."

  "M.S. — Concurseira, 3ª tentativa"
  "O fichamento em ABNT me salvou. Antes perdia 2h por PDF."

  "R.C. — Estudante de Direito"
  "Uso para provas da faculdade também. Os flashcards são absurdamente bons."

Animação GSAP — slide horizontal ao entrar:
  gsap.from(cards, {
    opacity: 0, x: 60, duration: 0.5, stagger: 0.15, ease: 'power2.out',
    scrollTrigger: { trigger: section, start: 'top 80%', once: true }
  })

---

10. Preços
Conteúdo:
  FREE — R$0
  - 3 editais/mês, 5 PDFs/mês, 5 flashcards por PDF
  - Export .ics e .docx
  CTA: "Começar grátis"

  ESTUDANTE — R$19,90/mês ← badge "Mais popular"
  - Tudo ilimitado, todos os exports, suporte por email
  CTA: "Assinar agora"

  PRO — R$39,90/mês
  - Tudo do Estudante + Concurso Assistant + revisão espaçada integrada
  CTA: "Assinar agora"

  Toggle mensal/anual — anual com estudante a R$ 199.90 e Pro a R$399.90

Animação GSAP:
  - Stagger de entrada dos 3 planos
  - Card "Mais popular": pulse único ao entrar
    gsap.from(popularCard, {
      scale: 0.95, duration: 0.4, ease: 'back.out(1.7)',
      scrollTrigger: { trigger: popularCard, start: 'top 85%', once: true }
    })

---

11. FAQ
5 perguntas no Accordion do shadcn/ui:
  - "Funciona com qualquer edital?"
  - "O .apkg abre mesmo no Anki oficial?"
  - "Posso cancelar quando quiser?"
  - "É diferente de só usar o ChatGPT?"
  - "Meus documentos ficam salvos?"

Animação: abertura padrão do shadcn (já animada).
Entrada da seção:
  gsap.from(accordionItems, {
    opacity: 0, y: 20, stagger: 0.08, duration: 0.4,
    scrollTrigger: { trigger: section, start: 'top 80%', once: true }
  })

---

12. CTA Final
Conteúdo:
  Título: "Sua aprovação começa com o primeiro edital."
  Subtítulo: "Grátis para começar. Sem cartão de crédito."
  Botão: "Criar conta grátis"
  Background: teal-600

Animação GSAP:
  const tl = gsap.timeline({
    scrollTrigger: { trigger: section, start: 'top 80%', once: true }
  })
  tl.from(title,    { opacity: 0, y: 30, duration: 0.5 })
    .from(subtitle, { opacity: 0, y: 20, duration: 0.4 }, '-=0.2')
    .from(button,   { opacity: 0, scale: 0.9, duration: 0.3 }, '-=0.1')

---

13. Footer
Conteúdo:
  Logo + "Trilha — Feito para quem estuda de verdade."
  Links: Termos | Privacidade | Contato
  "Feito no Brasil 🇧🇷"

---

Regras de responsividade

- Mobile-first obrigatório
- Hero: stack vertical no mobile, lado a lado no desktop
- Features: 1 col mobile, 2 tablet, 3 desktop
- Comparativo: scroll horizontal no mobile
- Preços: scroll horizontal no mobile
- Three.js canvas: desativado em telas < 768px
  (substituir por background gradiente simples para performance)

---

Regras de performance

- Three.js: lazy load com dynamic import
  const { HeroCanvas } = await import('@/components/landing/HeroCanvas')
- GSAP ScrollTrigger: registrar apenas no cliente (useEffect)
- Nunca importar GSAP no topo de server components
- Usar 'use client' em todos os componentes com animação
- Cleanup obrigatório em todos os useEffect com GSAP:
  return () => { ScrollTrigger.getAll().forEach(t => t.kill()) }

---

Regras de acessibilidade

- Todos os elementos animados com aria-hidden quando decorativos
- Canvas Three.js sempre com aria-hidden="true"
- prefers-reduced-motion: desativar TODAS as animações GSAP e Three.js
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(elements, { opacity: 1, y: 0, x: 0, scale: 1 })
    // não iniciar o loop do Three.js
  }
- Contraste mínimo 4.5:1 em todo o texto

---

O que NÃO fazer

- Sem Framer Motion — apenas GSAP e Three.js
- Sem Lorem Ipsum — todos os textos devem ser os reais acima
- Sem imagens de stock — avatares por iniciais, mockups geométricos
- Sem animações de scroll com scrub (parallax) agressivo
- Sem gsap.ticker no lugar de requestAnimationFrame no Three.js
- Sem animações infinitas em textos ou cards de conteúdo
- Sem importar GSAP em server components

---

Entregáveis finais

1. frontend/app/(marketing)/page.tsx
2. frontend/components/landing/ — um arquivo por seção
3. frontend/lib/gsap/gsapConfig.ts
4. frontend/lib/gsap/useReducedMotion.ts
5. Comandos de instalação das dependências

---

Antes de escrever qualquer código:
1. Confirme que entendeu a separação GSAP (UI/scroll) vs Three.js (3D background)
2. Liste todos os componentes que vão usar 'use client'
3. Confirme o plano de cleanup de ScrollTrigger
4. Aguarde minha aprovação para começar
