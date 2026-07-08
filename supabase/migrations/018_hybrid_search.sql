-- Aumentar memória temporariamente para a migration
SET maintenance_work_mem = '64MB';

-- Extensão para busca acento-insensitiva
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Configuração de text search que remove acentos antes de aplicar stemming
CREATE TEXT SEARCH CONFIGURATION public.portuguese_unaccent (COPY = portuguese);
ALTER TEXT SEARCH CONFIGURATION public.portuguese_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, portuguese_stem;

-- Coluna FTS gerada automaticamente a partir do conteúdo do chunk
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('public.portuguese_unaccent', coalesce(content, ''))) STORED;

-- Índice GIN para busca textual rápida
CREATE INDEX IF NOT EXISTS idx_document_chunks_tsv
  ON document_chunks USING gin (tsv);

-- Seção/heading do chunk (extraído no chunking_service.chunk_by_type)
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS section text;

-- RPC: search_chunks_hybrid
-- Combina semantic search (pgvector) + lexical search (FTS) via RRF.
CREATE OR REPLACE FUNCTION search_chunks_hybrid(
  query_embedding vector(1024),
  p_query text,
  p_document_ids uuid[],
  p_user_id uuid,
  p_keywords text[] DEFAULT array[]::text[],
  p_top_k int DEFAULT 20
) RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  section text,
  similarity float,
  semantic_rank int,
  lexical_rank int,
  rrf_score float
) LANGUAGE plpgsql AS $$
DECLARE
  v_query tsquery;
BEGIN
  v_query := websearch_to_tsquery('public.portuguese_unaccent', unaccent(coalesce(p_query, '')));

  RETURN QUERY
  WITH semantic AS (
    SELECT
      dc.id,
      dc.document_id,
      dc.chunk_index,
      dc.content,
      dc.section,
      (1 - (dc.embedding <=> query_embedding))::float AS similarity,
      row_number() OVER (ORDER BY dc.embedding <=> query_embedding) AS semantic_rank
    FROM document_chunks dc
    WHERE dc.document_id = ANY(p_document_ids)
      AND dc.user_id = p_user_id
      AND dc.embedding IS NOT NULL
  ),
  lexical AS (
    SELECT
      dc.id,
      dc.document_id,
      dc.chunk_index,
      dc.content,
      dc.section,
      ts_rank_cd(dc.tsv, v_query, 32)::float AS rank_score,
      row_number() OVER (ORDER BY ts_rank_cd(dc.tsv, v_query, 32) DESC) AS lexical_rank
    FROM document_chunks dc
    WHERE dc.document_id = ANY(p_document_ids)
      AND dc.user_id = p_user_id
      AND dc.tsv @@ v_query
  ),
  keyword_hits AS (
    SELECT
      dc.id,
      count(*)::int AS keyword_match_count
    FROM document_chunks dc,
         LATERAL unnest(p_keywords) AS kw
    WHERE dc.document_id = ANY(p_document_ids)
      AND dc.user_id = p_user_id
      AND unaccent(dc.content) ILIKE '%' || unaccent(kw) || '%'
    GROUP BY dc.id
  ),
  combined AS (
    SELECT
      s.id,
      s.document_id,
      s.chunk_index,
      s.content,
      s.section,
      s.similarity,
      s.semantic_rank,
      l.lexical_rank,
      coalesce(kh.keyword_match_count, 0) AS keyword_match_count
    FROM semantic s
    LEFT JOIN lexical l ON l.id = s.id
    LEFT JOIN keyword_hits kh ON kh.id = s.id
  )
  SELECT
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    c.section,
    c.similarity,
    c.semantic_rank::int AS semantic_rank,
    coalesce(c.lexical_rank, 0)::int AS lexical_rank,
    (coalesce(1.0 / (60 + c.semantic_rank), 0.0) +
    CASE WHEN c.lexical_rank IS NOT NULL THEN 1.0 / (60 + c.lexical_rank) * 1.5 ELSE 0.0 END +
    coalesce(c.keyword_match_count * 0.05, 0.0))::float AS rrf_score
  FROM combined c
  ORDER BY rrf_score DESC
  LIMIT p_top_k;
END;
$$;