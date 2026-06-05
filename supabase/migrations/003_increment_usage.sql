-- Migration: 003_increment_usage_function
-- Data: 2025-06-05
-- Rollback:
--   drop function if exists increment_usage;

-- Função RPC para incrementar contador de uso (upsert atômico)
create or replace function increment_usage(
  p_user_id uuid,
  p_feature text,
  p_mes_ano text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usage_tracking (user_id, feature, mes_ano, quantidade)
  values (p_user_id, p_feature, p_mes_ano, 1)
  on conflict (user_id, feature, mes_ano)
  do update set quantidade = public.usage_tracking.quantidade + 1;
end;
$$;
