-- Migration standalone: 019_admin_costs
-- Date: 2026-07-07
-- Execute via SQL Editor do Supabase Dashboard (CLI quebrada)
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

alter table ai_usage_log
  add column if not exists provider text default 'openrouter';

alter table ai_usage_log
  add column if not exists cache_hit boolean default false;

alter table ai_usage_log
  add column if not exists duracao_ms int;

alter table ai_usage_log
  add column if not exists status text default 'sucesso'
  check (status in ('sucesso', 'erro', 'timeout'));

alter table ai_usage_log
  add column if not exists erro_detalhe text;

alter table ai_usage_log
  add column if not exists edital_id uuid references documents(id) on delete set null;

alter table ai_usage_log
  add column if not exists reasoning_tokens int default 0;

update ai_usage_log set provider = 'openrouter' where provider is null;
update ai_usage_log set status = 'sucesso' where status is null;
update ai_usage_log set cache_hit = false where cache_hit is null;
update ai_usage_log set reasoning_tokens = 0 where reasoning_tokens is null;

-- ============================================================
-- precos_modelo — Preços por provider/modelo
-- ============================================================

create table if not exists precos_modelo (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  preco_input_por_mi numeric(10,4) not null,
  preco_output_por_mi numeric(10,4) not null,
  ativo_desde timestamptz default now(),
  unique(provider, model, ativo_desde)
);

create index if not exists idx_ai_usage_log_user_data on ai_usage_log(user_id, created_at);
create index if not exists idx_ai_usage_log_feature on ai_usage_log(feature, created_at);
create index if not exists idx_ai_usage_log_provider on ai_usage_log(provider, model);
create index if not exists idx_ai_usage_log_created_at on ai_usage_log(created_at);

insert into precos_modelo (provider, model, preco_input_por_mi, preco_output_por_mi, ativo_desde)
values
  ('openrouter', 'deepseek/deepseek-v4-flash', 0.0900, 0.1800, '2026-07-07 00:00:00+00'),
  ('voyage', 'voyage-4-large', 0.1000, 0.0000, '2026-07-07 00:00:00+00'),
  ('voyage', 'voyage-4-lite', 0.0500, 0.0000, '2026-07-07 00:00:00+00'),
  ('voyage', 'voyage-3', 0.0600, 0.0000, '2026-07-07 00:00:00+00')
on conflict (provider, model, ativo_desde) do update set
  preco_input_por_mi = excluded.preco_input_por_mi,
  preco_output_por_mi = excluded.preco_output_por_mi;

alter table precos_modelo enable row level security;
