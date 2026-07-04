-- Migration 013: Pivô Estratégico — Foco exclusivo em Concursos
-- Data: 2026-06-29
--
-- Remove toda referência acadêmica do banco de dados:
--   1. Converte documentos tipo 'tcc' → 'pdf_generico'
--   2. Remove 'tcc' do CHECK constraint de documents.tipo
--   3. Converte perfis 'universitario'/'mestrando' → 'concurseiro'
--   4. Remove 'universitario'/'mestrando' do CHECK constraint de profiles.perfil
--   5. Remove registros de shared_exports com export_type='fichamento'
--   6. Remove 'fichamento' do CHECK constraint de shared_exports.export_type
--
-- Rollback:
--   ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_tipo_check;
--   ALTER TABLE documents ADD CONSTRAINT documents_tipo_check CHECK (tipo IN ('edital', 'pdf_generico', 'tcc'));
--   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_perfil_check;
--   ALTER TABLE profiles ADD CONSTRAINT profiles_perfil_check CHECK (perfil IN ('concurseiro', 'universitario', 'mestrando'));
--   ALTER TABLE shared_exports DROP CONSTRAINT IF EXISTS shared_exports_export_type_check;
--   ALTER TABLE shared_exports ADD CONSTRAINT shared_exports_export_type_check CHECK (export_type IN ('cronograma', 'fichamento', 'flashcards'));
--   -- NOTA: Dados convertidos (tcc→pdf_generico, perfis→concurseiro) NÃO são revertidos automaticamente.

-- ============================================================
-- 1. Converter documentos tipo 'tcc' → 'pdf_generico'
-- ============================================================
UPDATE documents
SET tipo = 'pdf_generico'
WHERE tipo = 'tcc';

-- ============================================================
-- 2. Remover 'tcc' do CHECK constraint de documents.tipo
-- ============================================================
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_tipo_check;
ALTER TABLE documents ADD CONSTRAINT documents_tipo_check CHECK (tipo IN ('edital', 'pdf_generico'));

-- ============================================================
-- 3. Converter perfis 'universitario'/'mestrando' → 'concurseiro'
-- ============================================================
UPDATE profiles
SET perfil = 'concurseiro'
WHERE perfil IN ('universitario', 'mestrando');

-- ============================================================
-- 4. Remover 'universitario'/'mestrando' do CHECK constraint de profiles.perfil
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_perfil_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_perfil_check CHECK (perfil IN ('concurseiro'));

-- ============================================================
-- 5. Remover registros de shared_exports com export_type='fichamento'
-- ============================================================
DELETE FROM shared_exports
WHERE export_type = 'fichamento';

-- ============================================================
-- 6. Remover 'fichamento' do CHECK constraint de shared_exports.export_type
-- ============================================================
ALTER TABLE shared_exports DROP CONSTRAINT IF EXISTS shared_exports_export_type_check;
ALTER TABLE shared_exports ADD CONSTRAINT shared_exports_export_type_check CHECK (export_type IN ('cronograma', 'flashcards'));
