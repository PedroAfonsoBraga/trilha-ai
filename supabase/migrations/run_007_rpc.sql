-- Run this standalone in Supabase SQL Editor to create the search_chunks RPC
-- Migration 007 tables/policies already applied, just adding the function

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
