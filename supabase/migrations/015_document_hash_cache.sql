-- Migration: 015_document_hash_cache
-- Date: 2026-07-02
-- Rollback:
--   drop table if exists document_hash_cache cascade;
--   drop index if exists idx_document_hash_cache_lookup;

-- ============================================================
-- document_hash_cache — Cache global de PDFs parseados/chunkados
-- ============================================================
-- O cache é indexado pelo sha256 do conteúdo do arquivo + modelo de embedding.
-- Isso evita reprocessar o mesmo PDF (LlamaParse + chunking + embeddings)
-- quando o usuário faz upload de um arquivo idêntico.
--
-- A chave composta (file_hash, embedding_model) garante que uma mudança de
-- modelo de embedding invalide automaticamente entradas antigas.
--
-- Não há user_id nesta tabela: o conteúdo parseado é determinístico e
-- compartilhável entre usuários. O acesso é feito apenas pelo backend via
-- SUPABASE_SERVICE_ROLE_KEY (bypass RLS), igual à tabela ai_cache.

create table if not exists document_hash_cache (
  file_hash text not null,
  embedding_model text not null default 'voyage-3',
  texto_extraido text,
  markdown_text text,
  chunks_jsonb jsonb not null default '[]'::jsonb,
  page_count int,
  created_at timestamptz not null default now(),
  primary key (file_hash, embedding_model)
);

-- Índice de lookup (a PK já cobre, mas deixamos explícito para manutenção)
create index if not exists idx_document_hash_cache_lookup
  on document_hash_cache(file_hash, embedding_model);

-- RLS: sem políticas = deny all para anon/auth. Apenas service_role acessa.
alter table document_hash_cache enable row level security;
