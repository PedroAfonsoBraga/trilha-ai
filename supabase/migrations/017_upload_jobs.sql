-- Migration: 017_upload_jobs
-- Date: 2026-07-02
-- Rollback:
--   drop table if exists upload_jobs cascade;
--   drop index if exists idx_upload_jobs_user;
--   drop index if exists idx_upload_jobs_status;

-- ============================================================
-- upload_jobs — Fila de processamento assíncrono de uploads
-- ============================================================
-- Rastreia o progresso do pipeline: parsing -> chunking -> embedding -> upsert.
-- Usado tanto pelo worker asyncio quanto pelo endpoint SSE de progresso.

create table if not exists upload_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_id uuid not null references documents(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'done', 'failed')),
  stage text not null default 'queued'
    check (stage in ('queued', 'parsing', 'chunking', 'embedding', 'upsert', 'done')),
  progress int not null default 0
    check (progress between 0 and 100),
  error_msg text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_upload_jobs_user
  on upload_jobs(user_id);

create index if not exists idx_upload_jobs_status
  on upload_jobs(status);

alter table upload_jobs enable row level security;

create policy "usuarios leem seus proprios jobs"
  on upload_jobs for select
  using (auth.uid() = user_id);

-- INSERT/UPDATE são executados pelo backend via SUPABASE_SERVICE_ROLE_KEY
-- (bypass RLS), portanto não há políticas para essas operações.
