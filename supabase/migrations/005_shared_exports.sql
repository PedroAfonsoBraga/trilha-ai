-- Migration: 005_shared_exports
-- Data: 2025-06-06
-- Rollback:
--   drop table if exists shared_exports cascade;

-- ============================================================
-- shared_exports — links públicos com expiração
-- ============================================================
create table shared_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  document_id uuid references documents(id) not null,
  export_type text not null check (export_type in ('cronograma', 'fichamento', 'flashcards')),
  public_token text unique not null default gen_random_uuid()::text,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);

alter table shared_exports enable row level security;

create policy "usuarios veem seus shared_exports"
  on shared_exports for select
  using (auth.uid() = user_id);

create policy "usuarios inserem seus shared_exports"
  on shared_exports for insert
  with check (auth.uid() = user_id);

create policy "usuarios deletam seus shared_exports"
  on shared_exports for delete
  using (auth.uid() = user_id);
