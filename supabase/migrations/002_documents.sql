-- Migration: 002_documents
-- Data: 2025-06-05
-- Rollback:
--   drop table if exists documents cascade;
--   delete from storage.buckets where id = 'documents';
--   delete from storage.objects where bucket_id = 'documents';

-- ============================================================
-- documents
-- ============================================================
create table documents (
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
-- Storage bucket: documents
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do nothing;

-- RLS: dono do arquivo (path = {user_id}/{document_id}.pdf)
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

-- ============================================================
-- Storage bucket: exports
-- ============================================================
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
