-- Migration: 001_initial_schema
-- Data: 2025-06-04
-- Rollback:
--   drop table if exists subscriptions cascade;
--   drop table if exists profiles cascade;
--   drop function if exists handle_new_user() cascade;
--   drop trigger if exists on_auth_user_created on auth.users;

-- ============================================================
-- profiles
-- ============================================================
create table profiles (
  id uuid references auth.users primary key,
  email text not null,
  nome text,
  perfil text check (perfil in ('concurseiro', 'universitario', 'mestrando')),
  plano text not null default 'free'
    check (plano in ('free', 'estudante', 'pro')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "usuarios gerenciam seus dados"
  on profiles for select
  using (auth.uid() = id);

create policy "usuarios atualizam seus dados"
  on profiles for update
  using (auth.uid() = id);

create policy "trigger cria profile no signup"
  on profiles for insert
  with check (true);

create policy "usuarios deletam seus dados"
  on profiles for delete
  using (auth.uid() = id);

-- ============================================================
-- subscriptions
-- ============================================================
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan text not null check (plan in ('free', 'estudante', 'pro')),
  status text not null, -- active, canceled, past_due, trialing
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "usuarios veem apenas suas subscriptions"
  on subscriptions for all
  using (auth.uid() = user_id);

-- ============================================================
-- usage_tracking
-- ============================================================
create table usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  feature text not null, -- 'edital', 'pdf', 'flashcard', 'fichamento'
  mes_ano text not null, -- '2025-06'
  quantidade int default 0,
  unique(user_id, feature, mes_ano)
);

alter table usage_tracking enable row level security;

create policy "usuarios veem apenas seu usage"
  on usage_tracking for all
  using (auth.uid() = user_id);

-- ============================================================
-- ai_usage_log
-- ============================================================
create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  feature text not null,
  model text not null,
  input_tokens int,
  output_tokens int,
  cache_read_tokens int default 0,
  custo_estimado_usd numeric(10,6),
  created_at timestamptz default now()
);

alter table ai_usage_log enable row level security;

create policy "usuarios veem apenas seu ai_usage"
  on ai_usage_log for all
  using (auth.uid() = user_id);

-- ============================================================
-- Triggers
-- ============================================================

-- Criar profile automaticamente ao cadastrar
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Atualizar updated_at automaticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute procedure update_updated_at();
