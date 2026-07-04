-- Migration: 011_ai_cache_rls_fixes
-- Data: 2026-06-27
-- Rollback:
--   drop table if exists ai_cache cascade;
--   (políticas aditivas não precisam de rollback explícito)

-- ============================================================
-- ai_cache — Cache de outputs de LLM para evitar chamadas repetidas
-- ============================================================
create table if not exists ai_cache (
  id uuid primary key default gen_random_uuid(),
  input_hash text not null,
  model text not null,
  feature text not null,
  output text not null,
  input_tokens int,
  output_tokens int,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- Índice único para lookup rápido
create unique index if not exists idx_ai_cache_hash on ai_cache(input_hash);
-- Índice para limpeza de cache expirado
create index if not exists idx_ai_cache_expires on ai_cache(expires_at);

-- RLS: apenas o backend via service_role_key acessa ai_cache (sem user_id)
-- Nota: nenhuma política definida = deny all para usuários autenticados (via anon/key).
-- Isso é intencional: a tabela não tem user_id e só é acessada pelo cache_service
-- que usa SUPABASE_SERVICE_ROLE_KEY (bypassa RLS).
alter table ai_cache enable row level security;

-- ============================================================
-- Correções RLS — políticas faltantes identificadas no Sprint 9
-- ============================================================

-- shared_exports: faltava UPDATE (ex: renovar link)
create policy "usuarios atualizam seus links de compartilhamento"
  on shared_exports for update
  using (auth.uid() = user_id);

-- notification_preferences: faltava DELETE (ex: resetar preferências)
create policy "usuarios deletam suas preferencias de notificacao"
  on notification_preferences for delete
  using (auth.uid() = user_id);
