-- Migration: 016_embedding_model_column
-- Date: 2026-07-02
-- Rollback:
--   drop index if exists idx_document_chunks_embedding_model;
--   alter table document_chunks drop column if exists embedding_model;

-- ============================================================
-- document_chunks.embedding_model
-- ============================================================
-- Rastreia qual modelo de embedding gerou cada vetor.
-- Necessário para o cutover seguro voyage-3 -> voyage-4 (Sprint 15):
-- só podemos trocar o modelo de query quando TODOS os chunks antigos
-- tiverem sido re-indexados com o novo modelo.

alter table document_chunks
  add column if not exists embedding_model text not null default 'voyage-3';

-- Índice para verificação de migração: count(*) where embedding_model = 'voyage-3'
create index if not exists idx_document_chunks_embedding_model
  on document_chunks(embedding_model);

-- Comentário documentando a coluna
comment on column document_chunks.embedding_model is
  'Modelo de embedding usado para gerar o vetor (ex: voyage-3, voyage-4-large). Sprint 15.';
