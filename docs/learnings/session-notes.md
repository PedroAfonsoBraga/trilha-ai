# Session Notes — Trilha

## Status: Sprint 0 — Fundação (semanas 1–2) — CONCLUÍDO

### Feito
- [x] Scaffold Next.js 14 (App Router + Tailwind + shadcn/ui + Inter)
- [x] Scaffold FastAPI (uv + estrutura completa de pastas + deps)
- [x] Projeto Supabase conectado + migration 001 aplicada (profiles, subscriptions, RLS, trigger)
- [x] Supabase Auth funcionando (login, cadastro, logout, sessão SSR)
- [x] Middleware protegendo /dashboard/**
- [x] Stripe Checkout em modo teste + Customer Portal (endpoints criados)
- [x] Webhook Stripe → atualiza tabelas subscriptions e profiles
- [x] .env.example documentado nos 3 ambientes
- [x] CI/CD: vercel.json (frontend) + railway.toml (backend)
- [x] Produtos/prices Stripe criados: Estudante (R$19,90) e Pro (R$39,90)

### Gate do Sprint 0 — VERIFICADO
- [x] Auth: signup → login → session → logout funcionando via REST API
- [x] Stripe: webhook listener ativo, eventos processados pelo backend
- [x] Profile auto-criado no signup com plano "free" via trigger
- [x] Stripe `stripe listen` encaminha eventos para backend corretamente

### Para testar no browser
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend
cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 3: Stripe webhook
stripe listen --api-key sk_test_XXXX --forward-to localhost:8000/api/billing/webhook
```
Fluxo completo: abrir http://localhost:3000 → Cadastro → Login → redireciona /dashboard

### Stripe Price IDs (modo teste)
- Estudante (R$19,90/mês): price_1TeSV1JcyDCmwkxi6MP6xscY
- Pro (R$39,90/mês): price_1TeSV4JcyDCmwkxiIXNSXx4X
- Webhook secret (local): whsec_3a3ce099005c7e69dd9cb118a0175e98928e517776257f3ae3fb5a1c469040d2

### Decisões técnicas tomadas
- Embeddings: Voyage-3-lite
- Nome: Trilha
- Whisper: removido do MVP
- Biblioteca pública: removida do roadmap inicial
- Verificação .edu.br: removida
- Trigger handle_new_user: corrigido RLS + security definer + set search_path
- Políticas RLS: separadas por operação (SELECT, INSERT, UPDATE, DELETE)

### Keys armazenadas
- Supabase PAT: salvo em backend/.env
- Stripe webhook secret: salvo em backend/.env
- Stripe API keys: em frontend/.env.local e backend/.env

### Próxima sessão
Sprint 1 — ver docs/sprints/sprint-1.md
