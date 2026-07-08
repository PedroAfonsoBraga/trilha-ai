-- Migration: 019_admin_costs
-- Date: 2026-07-07
-- Rollback:
--   drop table if exists precos_modelo cascade;
--   drop index if exists idx_ai_usage_log_user_data;
--   drop index if exists idx_ai_usage_log_feature;
--   drop index if exists idx_ai_usage_log_provider;
--   drop index if exists idx_ai_usage_log_created_at;
--   alter table ai_usage_log drop column if exists provider;
--   alter table ai_usage_log drop column if exists cache_hit;
--   alter table ai_usage_log drop column if exists duracao_ms;
--   alter table ai_usage_log drop column if exists status;
--   alter table ai_usage_log drop column if exists erro_detalhe;
--   alter table ai_usage_log drop column if exists edital_id;
--   alter table ai_usage_log drop column if exists reasoning_tokens;

-- ============================================================
-- ai_usage_log — Enriquecimento para observabilidade de custos
-- ============================================================
-- A tabela já existe desde a migration 001. Aqui adicionamos campos
-- necessários para o painel admin de custos: provider, cache_hit,
-- latência, status, erro e reasoning_tokens. Todas as colunas são
-- nullable/têm default para preservar dados históricos.

-- Provider que executou a chamada (openrouter, voyage, etc)
alter table ai_usage_log
  add column if not exists provider text default 'openrouter';

-- Indica se o resultado veio do cache (sem custo real)
alter table ai_usage_log
  add column if not exists cache_hit boolean default false;

-- Latência da chamada em milissegundos
alter table ai_usage_log
  add column if not exists duracao_ms int;

-- Status da chamada (sucesso, erro, timeout)
alter table ai_usage_log
  add column if not exists status text default 'sucesso'
  check (status in ('sucesso', 'erro', 'timeout'));

-- Detalhe do erro quando status != 'sucesso'
alter table ai_usage_log
  add column if not exists erro_detalhe text;

-- Edital relacionado à chamada (quando aplicável)
alter table ai_usage_log
  add column if not exists edital_id uuid references documents(id) on delete set null;

-- Tokens de reasoning (DeepSeek V4 Flash) — separados dos completion tokens
alter table ai_usage_log
  add column if not exists reasoning_tokens int default 0;

-- Backfill: registros antigos sem provider herdam 'openrouter'
-- Nota: para tabelas com milhões de linhas, executar em batches via ctid;
-- para o volume beta de 2026, o update direto é suficiente (< 30s).
update ai_usage_log
  set provider = 'openrouter'
  where provider is null;

-- Backfill: status antigos sem valor herdam 'sucesso'
update ai_usage_log
  set status = 'sucesso'
  where status is null;

-- Backfill: cache_hit antigos sem valor herdam false
update ai_usage_log
  set cache_hit = false
  where cache_hit is null;

-- Backfill: reasoning_tokens antigos sem valor herdam 0
update ai_usage_log
  set reasoning_tokens = 0
  where reasoning_tokens is null;

-- ============================================================
-- precos_modelo — Preços por provider/modelo para cálculo de custo
-- ============================================================
-- Manter preços em tabela permite ajustar sem deploy e recalcular
-- custo histórico via ativo_desde. Acessada pelo backend via service_role.

create table if not exists precos_modelo (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  preco_input_por_mi numeric(10,4) not null,  -- USD por 1M tokens de entrada
  preco_output_por_mi numeric(10,4) not null, -- USD por 1M tokens de saída
  ativo_desde timestamptz default now(),
  unique(provider, model, ativo_desde)
);

-- ============================================================
-- Índices para queries de agregação do painel admin
-- ============================================================

create index if not exists idx_ai_usage_log_user_data
  on ai_usage_log(user_id, created_at);

create index if not exists idx_ai_usage_log_feature
  on ai_usage_log(feature, created_at);

create index if not exists idx_ai_usage_log_provider
  on ai_usage_log(provider, model);

create index if not exists idx_ai_usage_log_created_at
  on ai_usage_log(created_at);

-- ============================================================
-- Seed de preços vigentes (validar valores antes de aplicar)
-- ============================================================
-- Fontes:
--   DeepSeek V4 Flash via OpenRouter: https://openrouter.ai/deepseek/deepseek-v4-flash
--   Voyage AI: https://docs.voyageai.com/docs/pricing
--
-- Os preços abaixo devem ser revisados no momento do deploy; a tabela
-- permite correção sem novo deploy de código.

-- Evita duplicatas se a migration rodar mais de uma vez
insert into precos_modelo (provider, model, preco_input_por_mi, preco_output_por_mi, ativo_desde)
values
  ('openrouter', 'deepseek/deepseek-v4-flash', 0.0900, 0.1800, now()),
  ('voyage', 'voyage-4-large', 0.1000, 0.0000, now()),
  ('voyage', 'voyage-4-lite', 0.0500, 0.0000, now()),
  ('voyage', 'voyage-3', 0.0600, 0.0000, now())
on conflict (provider, model, ativo_desde) do nothing;

-- ============================================================
-- RLS
-- ============================================================
-- precos_modelo é tabela de configuração (sem user_id). O backend acessa
-- via SUPABASE_SERVICE_ROLE_KEY (bypassa RLS). Usuários autenticados não
-- devem ler preços diretamente.
alter table precos_modelo enable row level security;
