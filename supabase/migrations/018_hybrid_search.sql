-- Migration: 018_hybrid_search
-- Date: 2026-07-05
-- Rollback:
--   drop function if exists search_chunks_hybrid(vector(1024), text, uuid[], uuid, text[], int);
--   drop index if exists idx_document_chunks_tsv;
--   alter table document_chunks drop column if exists tsv;
--   alter table document_chunks drop column if exists section;
--   drop text search configuration if exists portuguese_unaccent;
--   drop extension if exists unaccent;

-- ============================================================
-- Full-Text Search híbrido para RAG do chat
-- ============================================================
-- Adiciona busca lexical (FTS) como complemento à busca vetorial.
-- A fusão RRF (Reciprocal Rank Fusion) combina os rankings semântico
-- e lexical, resolvendo o caso clássico: perguntas coloquiais do tipo
-- "cai matemática nesse edital?" falham na busca 100% semântica porque
-- o embedding da pergunta coloquial fica longe da redação formal do edital.
--
-- Também persiste a seção do chunk (já extraída pelo chunking_service)
-- para enriquecer o contexto enviado ao LLM.

-- Extensão para busca acento-insensitiva
 create extension if not exists unaccent;

-- Configuração de text search que remove acentos antes de aplicar stemming
 create text search configuration public.portuguese_unaccent (copy = portuguese);
 alter text search configuration public.portuguese_unaccent
   alter mapping for hword, hword_part, word with unaccent, portuguese_stem;

-- Coluna FTS gerada automaticamente a partir do conteúdo do chunk
 alter table document_chunks
   add column if not exists tsv tsvector
   generated always as (to_tsvector('public.portuguese_unaccent', coalesce(content, ''))) stored;

-- Índice GIN para busca textual rápida
 create index if not exists idx_document_chunks_tsv
   on document_chunks using gin (tsv);

-- Seção/heading do chunk (extraído no chunking_service.chunk_by_type)
 alter table document_chunks
   add column if not exists section text;

-- ============================================================
-- RPC: search_chunks_hybrid
-- ============================================================
-- Combina semantic search (pgvector) + lexical search (FTS) via RRF.
-- Recebe também um array de keywords para dar peso extra a termos conhecidos.
 create or replace function search_chunks_hybrid(
   query_embedding vector(1024),
   p_query text,
   p_document_ids uuid[],
   p_user_id uuid,
   p_keywords text[] default array[]::text[],
   p_top_k int default 20
 ) returns table (
   id uuid,
   document_id uuid,
   chunk_index int,
   content text,
   section text,
   similarity float,
   semantic_rank int,
   lexical_rank int,
   rrf_score float
 ) language plpgsql as $$
 declare
   v_query tsquery;
 begin
   v_query := websearch_to_tsquery('public.portuguese_unaccent', unaccent(coalesce(p_query, '')));

   return query
   with semantic as (
     select
       dc.id,
       dc.document_id,
       dc.chunk_index,
       dc.content,
       dc.section,
       1 - (dc.embedding <=> query_embedding) as similarity,
       row_number() over (order by dc.embedding <=> query_embedding) as semantic_rank
     from document_chunks dc
     where dc.document_id = any(p_document_ids)
       and dc.user_id = p_user_id
       and dc.embedding is not null
   ),
   lexical as (
     select
       dc.id,
       dc.document_id,
       dc.chunk_index,
       dc.content,
       dc.section,
       ts_rank_cd(dc.tsv, v_query, 32)::float as rank_score,
       row_number() over (order by ts_rank_cd(dc.tsv, v_query, 32) desc) as lexical_rank
     from document_chunks dc
     where dc.document_id = any(p_document_ids)
       and dc.user_id = p_user_id
       and dc.tsv @@ v_query
   ),
   keyword_hits as (
     select
       dc.id,
       count(*)::int as keyword_match_count
     from document_chunks dc,
          lateral unnest(p_keywords) as kw
     where dc.document_id = any(p_document_ids)
       and dc.user_id = p_user_id
       and unaccent(dc.content) ilike '%' || unaccent(kw) || '%'
     group by dc.id
   ),
   combined as (
     select
       s.id,
       s.document_id,
       s.chunk_index,
       s.content,
       s.section,
       s.similarity,
       s.semantic_rank,
       l.lexical_rank,
       coalesce(kh.keyword_match_count, 0) as keyword_match_count
     from semantic s
     left join lexical l on l.id = s.id
     left join keyword_hits kh on kh.id = s.id
   )
  select
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    c.section,
    c.similarity,
    c.semantic_rank,
    coalesce(c.lexical_rank, 0) as lexical_rank,
    coalesce(1.0 / (60 + c.semantic_rank), 0.0) +
    case when c.lexical_rank is not null then 1.0 / (60 + c.lexical_rank) * 1.5 else 0.0 end +
    coalesce(c.keyword_match_count * 0.05, 0.0) as rrf_score
  from combined c
  order by rrf_score desc
  limit p_top_k;
 end;
 $$;
