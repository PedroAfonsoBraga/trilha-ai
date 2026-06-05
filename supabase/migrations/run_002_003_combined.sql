-- ============================================================
-- Trilha — Migrations 002 + 003 para rodar no Supabase SQL Editor
-- Data: 2025-06-05
--
-- COMO RODAR:
--   1. Acesse https://supabase.com/dashboard
--   2. Selecione o projeto "kemuelptejyczyobfxuj"
--   3. Vá em "SQL Editor" no menu lateral
--   4. Cole este arquivo inteiro
--   5. Clique em "Run"
-- ============================================================

-- Rollback (se precisar desfazer):
--   drop table if exists documents cascade;
--   drop function if exists increment_usage;
--   delete from storage.buckets where id = 'documents';
--   delete from storage.buckets where id = 'exports';
--   delete from storage.objects where bucket_id in ('documents', 'exports');

-- ============================================================
-- PARTE 1: Tabela documents
-- ============================================================
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  tipo text not null check (tipo in ('edital', 'pdf_generico')),
  nome_original text not null,
  storage_path text not null,
  texto_extraido text,
  metadata jsonb default '{}',
  processado boolean default false,
  created_at timestamptz default now()
);

alter table documents enable row level security;

create policy "usuarios veem apenas seus documents"
  on documents for select
  using (auth.uid() = user_id);

create policy "usuarios inserem seus documents"
  on documents for insert
  with check (auth.uid() = user_id);

create policy "usuarios atualizam seus documents"
  on documents for update
  using (auth.uid() = user_id);

create policy "usuarios deletam seus documents"
  on documents for delete
  using (auth.uid() = user_id);

-- ============================================================
-- PARTE 2: Buckets de Storage (RLS via path user_id)
-- ============================================================

-- Bucket: documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do nothing;

create policy "usuarios fazem upload dos seus pdfs"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "usuarios leem seus pdfs"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "usuarios deletam seus pdfs"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Bucket: exports
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exports',
  'exports',
  false,
  52428800,
  array[
    'application/ics',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'text/calendar'
  ]
)
on conflict (id) do nothing;

create policy "usuarios fazem upload dos seus exports"
  on storage.objects for insert
  with check (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "usuarios leem seus exports"
  on storage.objects for select
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "usuarios deletam seus exports"
  on storage.objects for delete
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- PARTE 3: Função RPC increment_usage
-- ============================================================
create or replace function increment_usage(
  p_user_id uuid,
  p_feature text,
  p_mes_ano text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usage_tracking (user_id, feature, mes_ano, quantidade)
  values (p_user_id, p_feature, p_mes_ano, 1)
  on conflict (user_id, feature, mes_ano)
  do update set quantidade = public.usage_tracking.quantidade + 1;
end;
$$;
