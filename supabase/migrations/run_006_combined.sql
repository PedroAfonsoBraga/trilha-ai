-- Migration: 006_student_progress (consolidated)
-- Data: 2025-06-08
-- Rollback:
--   drop table if exists student_progress cascade;
--   drop table if exists notification_preferences cascade;

-- ============================================================
-- student_progress — acompanhamento de estudos por disciplina/semana
-- ============================================================
create table if not exists student_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  document_id uuid references documents(id) not null,
  semana int not null,
  disciplina text not null,
  horas_estudadas real default 0,
  completed boolean default false,
  nota text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table student_progress enable row level security;

create policy "usuarios veem seus progressos"
  on student_progress for select
  using (auth.uid() = user_id);

create policy "usuarios inserem seus progressos"
  on student_progress for insert
  with check (auth.uid() = user_id);

create policy "usuarios atualizam seus progressos"
  on student_progress for update
  using (auth.uid() = user_id);

create policy "usuarios deletam seus progressos"
  on student_progress for delete
  using (auth.uid() = user_id);

create unique index if not exists idx_student_progress_unique
  on student_progress (user_id, document_id, semana, disciplina);

-- ============================================================
-- notification_preferences — preferencias de email do usuario
-- ============================================================
create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null unique,
  prazo_prova boolean default true,
  lembrete_estudo boolean default true,
  resumo_semanal boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table notification_preferences enable row level security;

create policy "usuarios veem suas preferencias"
  on notification_preferences for select
  using (auth.uid() = user_id);

create policy "usuarios inserem suas preferencias"
  on notification_preferences for insert
  with check (auth.uid() = user_id);

create policy "usuarios atualizam suas preferencias"
  on notification_preferences for update
  using (auth.uid() = user_id);
