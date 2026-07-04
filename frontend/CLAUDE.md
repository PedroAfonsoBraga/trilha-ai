# Trilha — Frontend

## Stack
- Next.js 14 (App Router) — Server Components por padrão
- Tailwind CSS + shadcn/ui
- TypeScript estrito (strict: true no tsconfig)
- Deploy: Vercel

## Estrutura de pastas
frontend/
├── app/
│   ├── (auth)/          ← login, cadastro, recuperação
│   ├── (dashboard)/     ← área logada
│   │   ├── concurso/    ← Concurso Assistant
│   │   ├── flashcards/  ← geração e revisão
│   │   ├── library/     ← biblioteca com busca semântica
│   │   ├── plano/       ← gerenciamento de assinatura
│   │   ├── custos/      ← custos de IA
│   │   └── chat/        ← chat RAG com documentos
│   ├── (marketing)/     ← landing, preços, sobre
│   └── api/             ← route handlers (apenas webhooks e auth callbacks)
├── components/
│   ├── ui/              ← shadcn/ui (não editar manualmente)
│   └── app/             ← componentes do produto
├── lib/
│   ├── supabase/        ← client e server clients
│   ├── stripe/          ← helpers de billing
│   └── utils/           ← formatadores, validadores
└── types/               ← tipos globais TypeScript

## Regras obrigatórias
- Server Components por padrão — só usar "use client" quando necessário
  (eventos de usuário, hooks, estado local)
- Nunca verificar plano/acesso no frontend — sempre via backend ou
  Supabase RLS
- Nunca expor STRIPE_SECRET_KEY ou ANTHROPIC_API_KEY no client
- Formulários: React Hook Form + Zod para validação
- Fetch de dados: sempre em Server Components ou Server Actions
- Loading states: usar Suspense + skeleton, nunca spinner global

## Padrão de autenticação
- Supabase Auth com SSR (@supabase/ssr)
- Client browser: createBrowserClient()
- Server/middleware: createServerClient()
- Middleware em middleware.ts protege rotas /dashboard/**
- Callback de OAuth em app/(auth)/callback/route.ts

## Padrão de acesso ao plano
// ✅ Correto — verificar no Server Component
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('plan, status')
  .eq('user_id', user.id)
  .single()

// ❌ Nunca fazer no client
const plan = localStorage.getItem('plan')

## Componentes UI
- Usar shadcn/ui como base — não reinventar
- Instalar via: npx shadcn@latest add [componente]
- Customizar via Tailwind, não sobrescrever CSS do shadcn
- Paleta de cores definida em tailwind.config.ts (ver tokens de design)

## Tokens de design
- Primary: #0D9488 (teal-600)
- Background: #F8FAFC
- Text: #1E293B
- Border: #E2E8F0
- Success: #059669
- Error: #DC2626
- Fonte: Inter (Google Fonts)

## Variáveis de ambiente necessárias
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=

## Performance
- Imagens: sempre next/image com width e height definidos
- Fontes: next/font — nunca importar do Google diretamente
- Bundle: não importar bibliotecas pesadas no client sem dynamic import
- dynamic(() => import(...), { ssr: false }) para libs client-only

## Testes
- Playwright para E2E (testes críticos: auth, upload, pagamento)
- Vitest para utilitários e hooks
- Não testar componentes shadcn/ui — já são testados na lib
