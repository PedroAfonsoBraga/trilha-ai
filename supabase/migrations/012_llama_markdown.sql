-- Migration: 012_llama_markdown
-- Data: 2026-06-29
-- Descricao: Adiciona coluna markdown_text para suportar LlamaParse,
--            corrige allowed_mime_types do bucket documents para aceitar DOCX
-- Rollback:
--   ALTER TABLE documents DROP COLUMN IF EXISTS markdown_text;
--   UPDATE storage.buckets
--   SET allowed_mime_types = ARRAY['application/pdf']
--   WHERE id = 'documents';

-- ============================================================
-- Adiciona coluna markdown_text na tabela documents
-- ============================================================
-- A coluna markdown_text armazena o Markdown estruturado extraido
-- via LlamaParse. E nullable para compatibilidade com documentos
-- existentes e fallback PyMuPDF.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS markdown_text text;

-- ============================================================
-- Corrige allowed_mime_types do bucket documents
-- ============================================================
-- O bucket atualmente so aceita application/pdf, mas o backend
-- tambem aceita DOCX. Corrigimos para aceitar ambos.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE id = 'documents';
