Vamos criar a landing page da Trilha em:
frontend/app/(marketing)/page.tsx

## Stack de animação
Instale e use Framer Motion.
Todas as animações devem ser:
- Suaves (duration entre 0.4s e 0.8s)
- Ativadas por scroll (useInView do Framer Motion)
- Com easing "easeOut" ou "anticipate"
- Nunca automáticas e infinitas (evitar enjoo visual)
- Respeitando prefers-reduced-motion (acessibilidade)

## Estrutura da página — nesta ordem

### 1. Navbar
- Logo "Trilha" à esquerda (ícone de trilha/path SVG simples)
- Links: Funcionalidades | Preços | Entrar
- Botão CTA: "Começar grátis" (teal-600)
- Sticky com backdrop-blur ao rolar
- Animação: fade-in ao carregar (delay 0.2s)

### 2. Hero Section
Headline principal:
  "Do edital ao Anki em minutos."
Subheadline:
  "A Trilha transforma qualquer edital de concurso em cronograma,
   fichamento ABNT e flashcards prontos — automaticamente."

- CTA primário: "Começar grátis" → /cadastro
- CTA secundário: "Ver como funciona" → âncora #como-funciona
- Badge social proof: "Feito para CESPE · FCC · Vunesp"
- Animação hero: texto entra com fade + slide-up em stagger (título → subtítulo → CTAs)
- Background: gradiente sutil de #F8FAFC para branco com partículas
  geométricas levíssimas (não distrativas)

### 3. Barra de Logos — "Bancas suportadas"
- Logos/badges: CESPE · CEBRASPE · FCC · Vunesp · FGV · IBFC
- Scroll horizontal infinito e suave (marquee) no mobile
- Texto acima: "Reconhece automaticamente o padrão de cada banca"

### 4. Seção "O problema" — Pain Agitation
Título: "Você estuda muito. Mas está estudando certo?"
3 cards lado a lado com ícone + texto:
  - "Edital com 20 disciplinas e você não sabe por onde começar"
  - "Fichamento na mão, horas perdidas, formatação errada"
  - "Flashcards que você nunca termina de montar no Anki"
Animação: cards entram em stagger com slide-up ao entrar na viewport

### 5. Seção "Como funciona" — id="como-funciona"
Título: "Três passos. Sem complicação."

Passo 1: Envie o edital em PDF
Passo 2: A Trilha analisa banca, disciplinas e pesos
Passo 3: Baixe seu cronograma, fichamento e flashcards

- Visual: mockup simples estilo "browser frame" mostrando a interface
  (pode ser placeholder cinza elegante com elementos de UI sugeridos)
- Animação: linha conectando os 3 passos que se "desenha" ao rolar (SVG path animation)
- Número do passo em teal grande ao fundo (decorativo, opacity 0.07)

### 6. Features — "Tudo que você precisa"
Grid 2x3 de feature cards:

  🗓️ Cronograma inteligente
  "Distribui as disciplinas por peso e data da prova automaticamente."

  📄 Fichamento ABNT
  "Gera o fichamento em .docx pronto para entregar ou imprimir."

  🃏 Flashcards para Anki
  "Exporta .apkg real — abre direto no Anki com revisão espaçada."

  📅 Google Calendar
  "Exporta .ics com todas as datas da prova e marcos do cronograma."

  🤖 Entende a sua banca
  "Reconhece o padrão CESPE, FCC e Vunesp. Não é um chatbot genérico."

  🔁 Revisão espaçada SM-2
  "O mesmo algoritmo do Anki, integrado. Estude menos, retenha mais."

- Animação: cards com hover que eleva levemente (translateY -4px + shadow)
- Entrada: fade-in em stagger ao entrar na viewport

### 7. Seção "Não somos o ChatGPT"
Comparativo visual em 2 colunas:

| ChatGPT / IA genérica | Trilha |
|---|---|
| Responde qualquer coisa, mal | Especialista em concursos |
| Você tem que formatar tudo | ABNT, .docx, .apkg gerados |
| Não conhece sua banca | Reconhece CESPE, FCC, Vunesp |
| Sem exportação real | Arquivos prontos para usar |
| R$100+/mês | A partir de R$19,90 |

- Coluna Trilha com borda teal e badge "✓"
- Coluna genérica em cinza com "✗"
- Animação: tabela entra com fade ao rolar

### 8. Contador de impacto — Social Proof
3 números grandes animados (countUp ao entrar na viewport):

  "4.200+ editais processados"
  "38.000+ flashcards gerados"
  "R$280/mês economizados vs cursinho"

- Fonte grande, bold, teal-600
- Animação: números sobem de 0 ao valor real em 1.5s

### 9. Depoimentos
3 cards com depoimento fictício mas realista (marcar claramente como
beta testers — não inventar nomes completos, usar iniciais):

  "P.A. — Aprovado AGU 2024"
  "Nunca pensei que montar um cronograma seria tão simples.
   Colei o edital e em 2 minutos tinha tudo organizado por semana."

  "M.S. — Concurseira, 3ª tentativa"
  "O fichamento em ABNT me salvou. Antes perdia 2h por PDF."

  "R.C. — Estudante de Direito"
  "Uso para provas da faculdade também. Os flashcards são absurdamente bons."

- Cards com foto avatar placeholder (iniciais em círculo teal)
- Animação: slide horizontal suave ao entrar na viewport

### 10. Preços
3 planos lado a lado:

  FREE — R$0
  - 3 editais/mês
  - 5 PDFs/mês
  - 5 flashcards por PDF
  - Export .ics e .docx
  CTA: "Começar grátis"

  ESTUDANTE — R$19,90/mês ← destacado como "mais popular"
  - Tudo ilimitado
  - Todos os exports
  - Suporte por email
  CTA: "Assinar agora"

  PRO — R$39,90/mês
  - Tudo do Estudante
  - Concurso Assistant (chat com edital)
  - Revisão espaçada integrada
  - Prioridade no suporte
  CTA: "Assinar agora"

- Plano Estudante com borda teal e badge "Mais popular"
- Toggle anual/mensal (anual com desconto 20%)
- Animação: card do plano popular pulsa levemente uma vez ao entrar na viewport

### 11. FAQ
5 perguntas em acordeão (Accordion do shadcn/ui):

  - "Funciona com qualquer edital?"
  - "O .apkg abre mesmo no Anki oficial?"
  - "Posso cancelar quando quiser?"
  - "É diferente de só usar o ChatGPT?"
  - "Meus documentos ficam salvos?"

- Animação: abertura suave do acordeão (já vem no shadcn)

### 12. CTA Final
Título: "Sua aprovação começa com o primeiro edital."
Subtítulo: "Grátis para começar. Sem cartão de crédito."
Botão grande: "Criar conta grátis"
- Background: teal-600 com texto branco
- Animação: botão com pulse suave uma vez ao entrar na viewport

### 13. Footer
- Logo + tagline: "Trilha — Feito para quem estuda de verdade."
- Links: Termos | Privacidade | Contato
- "Feito no Brasil 🇧🇷"

## Regras de animação — IMPORTANTES
- Usar sempre: `initial={{ opacity: 0, y: 20 }}` + `whileInView={{ opacity: 1, y: 0 }}`
- Sempre incluir: `viewport={{ once: true }}` — anima só na primeira vez
- Stagger em listas: `transition={{ staggerChildren: 0.1 }}`
- Reduced motion:
  ```tsx
  const prefersReducedMotion = useReducedMotion()
  const animation = prefersReducedMotion ? {} : { opacity: 0, y: 20 }
```
    NUNCA usar animações infinitas em elementos grandes

Responsividade

    Mobile-first obrigatório
    Hero: stack vertical no mobile
    Grid features: 1 coluna mobile, 2 tablet, 3 desktop
    Comparativo: scroll horizontal no mobile
    Preços: scroll horizontal no mobile

Paleta de cores (tailwind.config.ts)

Primary: #0D9488 (teal-600) Background: #F8FAFC Text: #1E293B Border: #E2E8F0 Success: #059669 Muted: #64748B
O que NÃO fazer

    Sem gradientes neon ou cores vibrantes demais
    Sem animações que piscam ou chamam atenção excessiva
    Sem Lorem Ipsum — todos os textos devem ser os reais acima
    Sem imagens de stock — usar mockups geométricos e avatares por iniciais
    Sem bibliotecas além de Framer Motion (não instalar GSAP, AOS, etc)

Entregáveis esperados

    frontend/app/(marketing)/page.tsx — página completa
    frontend/components/app/landing/ — componentes separados por seção
    frontend/tailwind.config.ts — com tokens de cor definidos
    Comando para instalar Framer Motion

Crie os componentes separados por seção (HeroSection, FeaturesSection, etc). Não coloque tudo em um único arquivo. Me pergunte se tiver dúvida antes de criar qualquer arquivo.