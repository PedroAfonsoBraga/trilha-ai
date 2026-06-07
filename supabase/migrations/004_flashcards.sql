-- Migration: 004_flashcards
-- Data: 2025-06-06
-- Rollback:
--   drop table if exists flashcards cascade;

-- ============================================================
-- flashcards
-- ============================================================
create table flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  document_id uuid references documents(id),
  frente text not null,
  verso text not null,
  tags text[] default '{}',
  -- SM-2 spaced repetition
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

-- Update exports bucket to accept .apkg
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
