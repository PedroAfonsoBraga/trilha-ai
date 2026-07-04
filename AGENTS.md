# AGENTS.md — Trilha

## Antes de qualquer tarefa
Leia `docs/learnings/session-notes.md` — contém estado dos sprints, bugs conhecidos e bloqueios.

## Comandos exatos

```bash
# Backend (usa uv, NÃO pip/poetry)
cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend && npm run dev

# TypeScript check (node pode não estar no PATH)
cd frontend && ./node_modules/.bin/tsc --noEmit

# Python import check
cd backend && uv run python -c "from app.main import app"
```

## Stack e limites de cada pacote

| Diretório | Runtime | Entrypoints |
|---|---|---|
| `backend/` | Python 3.11 (uv) | `app/main.py` → routers em `app/routers/` |
| `frontend/` | Next.js 14 App Router | Route groups: `(auth)`, `(dashboard)`, `(marketing)` |
| `supabase/` | SQL | Migrations aplicadas via SQL Editor do Dashboard (CLI quebrada) |

- **NÃO há conexão direta ao PostgreSQL** — firewall do Supabase bloqueia. Toda migration roda no SQL Editor do Dashboard.
- Backend comunica com Supabase via `service_role_key` usando a lib `supabase` (client HTTP).
- Frontend comunica com backend via `/api/*` usando `fetch` + `accessToken` no header `Authorization: Bearer`.
- IA: DeepSeek V4 Flash (deepseek/deepseek-v4-flash) via OpenRouter (OpenAI-compatible, AsyncOpenAI SDK).
- Embeddings: `voyage-4-large` para documentos e `voyage-4-lite` para queries (default 1024 dims, vetorialmente compatíveis). Cutover controlado por `EMBEDDING_MODEL_VERSION` no `.env` (`voyage-3` legado / `voyage-4`).

## Padrões que quebram em produção

### `.single()` → NUNCA usar
Usar `query.limit(1).execute()` + check manual de `result.data`. `.single()` lança exceção com 0 rows. Bug recorrente (Sprint 1), ainda reapareceu no webhook do Stripe (Sprint 5).

### `load_dotenv()` obrigatório em TODO arquivo que lê env vars
Colocar no topo do módulo, antes de `os.getenv()`. Esquecer isso causa `SUPABASE_URL` vazio silenciosamente.

### JSON recovery da IA
Modelos podem truncar respostas longas. Sempre fazer recovery fechando `}`/`]` desbalanceados antes de `json.loads()`.

### Rate limiter — verificar subscriptions, não profiles
`get_user_plan()` em `rate_limiter.py` deve consultar a tabela `subscriptions` (status `active`/`trialing`) primeiro. `profiles.plano` pode estar desatualizado se o webhook do Stripe falhou.

### Rotas dentro de `(dashboard)/`
Toda página logada fica em `app/(dashboard)/dashboard/`. O prefixo `(dashboard)` é route group e não aparece na URL.

### Server Components por padrão
Frontend: só usar `"use client"` para interatividade (eventos, hooks, estado). Dados são sempre fetchados no Server Component e passados como props para Client Components com `accessToken`.

## Banco de dados

- RLS ativo em TODAS as tabelas com `user_id` desde a migration 001.
- Políticas RLS separadas por operação (SELECT, INSERT, UPDATE, DELETE).
- Migrations numeradas sequencialmente (`001_`, `002_`, …). Comentário de rollback no topo de cada arquivo.
- Storage buckets: `documents/` e `exports/` — path = `{user_id}/{doc_id}.ext`.
- Nunca alterar migration já aplicada — criar nova.

## Serviços — modo mock

- `RESEND_API_KEY` ausente → serviços de email logam `[MOCK]` e retornam sucesso (não quebram).
- `VOYAGE_API_KEY` ausente → busca semântica e embeddings falham com erro 500.
