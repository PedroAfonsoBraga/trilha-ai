# Trilha — Plataforma SaaS Educacional com IA

## Quem você é
Você é um senior engineer web developer - você opera onde CLAUDE é chamado

## Produto
SaaS educacional brasileiro. Nicho de entrada: concurseiros.
Nome: Trilha (definitivo).

## Stack
- Frontend: Next.js 14 (App Router) + Tailwind + shadcn/ui → Vercel
- Backend: FastAPI (Python 3.11) → Railway
- Banco: Supabase (PostgreSQL + pgvector + Auth + Storage)
- IA: DeepSeek V4 Flash (deepseek/deepseek-v4-flash) via OpenRouter (OpenAI-compatible, AsyncOpenAI SDK)
- Embeddings: Voyage-4-large para documentos + Voyage-4-lite para queries (cutover controlado por EMBEDDING_MODEL_VERSION)
- Pagamentos: Stripe (Checkout + Customer Portal + webhooks)
- Email: Resend + React Email
- Jobs: Inngest (serverless)
- Export Anki: genanki (Python)
- Monitoramento: Sentry + Posthog

## Regras obrigatórias
- Async/await em todo o backend — sem código síncrono em rotas
- Verificar subscription.status SEMPRE no backend, nunca no frontend
- Usar Chat Completions API (`deepseek/deepseek-v4-flash`) via OpenRouter em todas as chamadas com docs > 2k tokens
- RLS ativo em todas as tabelas Supabase desde a migration 001
- Variáveis de ambiente: nunca hardcodar keys no código

## chaves 
Stripe keys:
public: pk_test_xxxx
private: sk_test_xxxx
## Planos (lógica de acesso)
- Free: 3 editais/mês, 5 PDFs/mês, 5 flashcards por PDF
- Estudante (R$19,90): ilimitado, sem Concurso Assistant
- Pro (R$39,90): tudo ilimitado + Concurso Assistant

## Sprint atual
Sprint 15 — Otimização de Custo (Voyage) + Performance de Upload (implementação concluída — gate pendente)
Sprint 10 — Migração Parser PDF: PyMuPDF → LlamaParse (concluído)
Sprint 12 — Pivô Estratégico: Foco exclusivo em Concursos Públicos (concluído — ver docs/sprints/sprint-12.md)

## Como iniciar cada sessão
Leia docs/learnings/session-notes.md antes de qualquer tarefa.
