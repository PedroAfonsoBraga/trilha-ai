-- Combined migrations 004 + 005 for Sprint 2
-- Run this in Supabase Dashboard → SQL Editor
-- Date: 2025-06-06
-- Rollback at bottom

-- ============================================================
-- 004: flashcards table + RLS
-- ============================================================
create table flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  document_id uuid references documents(id),
  frente text not null,
  verso text not null,
  tags text[] default '{}',
  easiness_factor float default 2.5,
  repetitions int default 0,
  interval_days int default 1,
  next_review timestamptz default now(),
  created_at timestamptz default now()
);

alter table flashcards enable row level security;

create policy "usuarios veem apenas seus flashcards"
  on flashcards for select
  using (auth.uid() = user_id);

create policy "usuarios inserem seus flashcards"
  on flashcards for insert
  with check (auth.uid() = user_id);

create policy "usuarios atualizam seus flashcards"
  on flashcards for update
  using (auth.uid() = user_id);

create policy "usuarios deletam seus flashcards"
  on flashcards for delete
  using (auth.uid() = user_id);

update storage.buckets
set allowed_mime_types = array[
  'application/ics',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'text/calendar',
  'application/octet-stream',
  'application/apkg'
]
where id = 'exports';

-- ============================================================
-- 005: shared_exports table + RLS
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

-- ============================================================
-- Rollback:
-- drop table if exists shared_exports cascade;
-- drop table if exists flashcards cascade;
-- ============================================================
