# Sprint 0 — Fundação
**Semanas 1–2 · Fase 1 (MVP)**

## Objetivo
Esqueleto funcional: repo, CI/CD, auth e billing conectados.
Nenhuma lógica de negócio ainda.

## Entregas
- [ ] Scaffold Next.js 14 (App Router + Tailwind + shadcn/ui)
- [ ] Scaffold FastAPI (Python 3.11 + uv)
- [ ] Projeto Supabase + migration 001 (profiles, subscriptions, RLS)
- [ ] Supabase Auth funcionando (login, logout, sessão SSR)
- [ ] Middleware protegendo /dashboard/**
- [ ] Stripe Checkout em modo teste + Customer Portal
- [ ] Webhook Stripe → atualiza tabela subscriptions
- [ ] CI/CD: deploy automático Vercel (front) + Railway (back)
- [ ] .env.example documentado nos 3 ambientes

## Gate de saída
✅ Stripe em modo teste recebe pagamento simulado e atualiza o plano do usuário no banco.
✅ Usuário consegue cadastrar, logar, e a sessão persiste após refresh.

## Fora de escopo
Qualquer feature de IA, upload de PDF, parser de edital.

## Riscos
- Configuração do webhook Stripe local (usar Stripe CLI: stripe listen)
- SSR auth do Supabase tem armadilhas — seguir doc @supabase/ssr à risca
