-- Migration: 010_flashcard_reviews
-- Data: 2026-06-27
-- Rollback:
--   drop table if exists flashcard_reviews cascade;

-- ============================================================
-- flashcard_reviews
-- Historico imutavel de revisoes de flashcards (SM-2)
-- ============================================================
create table flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  flashcard_id uuid references flashcards(id) on delete cascade not null,
  quality int not null check (quality in (1, 3, 5)),
  easiness_factor_before float,
  easiness_factor_after float,
  interval_days_before int,
  interval_days_after int,
  repetitions_before int,
  repetitions_after int,
  reviewed_at timestamptz default now()
);

alter table flashcard_reviews enable row level security;

create policy "usuarios veem seus registros de revisao"
  on flashcard_reviews for select
  using (auth.uid() = user_id);

create policy "usuarios inserem seus registros de revisao"
  on flashcard_reviews for insert
  with check (auth.uid() = user_id);

-- Index para consultas de relatorio por usuario
create index idx_flashcard_reviews_user_id on flashcard_reviews(user_id);
create index idx_flashcard_reviews_flashcard_id on flashcard_reviews(flashcard_id);
