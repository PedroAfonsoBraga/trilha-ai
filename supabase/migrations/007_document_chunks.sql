-- Migration: 007_document_chunks
-- Date: 2026-06-08
-- Rollback:
--   drop table if exists chat_messages cascade;
--   drop table if exists chat_sessions cascade;
--   drop table if exists document_chunks cascade;
--   drop index if exists idx_document_chunks_embedding;

create extension if not exists vector;

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  token_count int,
  embedding vector(1024),
  created_at timestamptz not null default now()
);

create index if not exists idx_document_chunks_document
  on document_chunks(document_id);

create index if not exists idx_document_chunks_embedding
  on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table document_chunks enable row level security;

create policy "usuarios leem seus proprios chunks"
  on document_chunks for select
  using (auth.uid() = user_id);

create policy "usuarios inserem seus proprios chunks"
  on document_chunks for insert
  with check (auth.uid() = user_id);

create policy "usuarios deletam seus proprios chunks"
  on document_chunks for delete
  using (auth.uid() = user_id);

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_ids uuid[] not null default array[]::uuid[],
  titulo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table chat_sessions enable row level security;

create policy "usuarios leem suas proprias sessoes"
  on chat_sessions for select
  using (auth.uid() = user_id);

create policy "usuarios criam suas proprias sessoes"
  on chat_sessions for insert
  with check (auth.uid() = user_id);

create policy "usuarios atualizam suas proprias sessoes"
  on chat_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "usuarios deletam suas proprias sessoes"
  on chat_sessions for delete
  using (auth.uid() = user_id);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tokens_used int,
  chunks_citados uuid[],
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_session
  on chat_messages(session_id);

alter table chat_messages enable row level security;

create policy "usuarios leem suas proprias mensagens"
  on chat_messages for select
  using (auth.uid() = user_id);

create policy "usuarios criam suas proprias mensagens"
  on chat_messages for insert
  with check (auth.uid() = user_id);

create policy "usuarios deletam suas proprias mensagens"
  on chat_messages for delete
  using (auth.uid() = user_id);

create or replace function search_chunks(
  query_embedding vector(1024),
  p_document_ids uuid[],
  p_user_id uuid,
  p_top_k int default 10
) returns table (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  similarity float
) language plpgsql as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where dc.document_id = any(p_document_ids)
    and dc.user_id = p_user_id
  order by dc.embedding <=> query_embedding
  limit p_top_k;
end;
$$;
