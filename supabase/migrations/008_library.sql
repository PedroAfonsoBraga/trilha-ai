-- Migration: 008_library
-- Date: 2026-06-21
-- Rollback:
--   alter table documents drop column if exists tags;
--   drop function if exists search_all_chunks;
--   drop index if exists idx_documents_tags;

alter table documents add column if not exists tags text[] default '{}';

create index if not exists idx_documents_tags on documents using gin (tags);

create or replace function search_all_chunks(
  query_embedding vector(1024),
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
  where dc.user_id = p_user_id
  order by dc.embedding <=> query_embedding
  limit p_top_k;
end;
$$;
