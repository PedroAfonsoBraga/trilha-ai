-- Migration 009: Add 'tcc' as allowed document tipo
-- Rollback:
--   ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_tipo_check;
--   ALTER TABLE documents ADD CONSTRAINT documents_tipo_check CHECK (tipo IN ('edital', 'pdf_generico'));

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_tipo_check;
ALTER TABLE documents ADD CONSTRAINT documents_tipo_check CHECK (tipo IN ('edital', 'pdf_generico', 'tcc'));
