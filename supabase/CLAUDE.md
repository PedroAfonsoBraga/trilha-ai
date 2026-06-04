# Trilha — Supabase / Banco de Dados

## Configuração
- PostgreSQL via Supabase
- pgvector habilitado (extensão)
- Supabase Auth para autenticação
- Supabase Storage para PDFs e arquivos gerados

## Regras obrigatórias
- RLS (Row Level Security) ATIVO em todas as tabelas desde a migration 001
- Nunca usar service_role_key no frontend
- Migrations numeradas: 001_, 002_, 003_...
- Toda migration deve ter comentário de rollback no topo
- Nunca alterar migration já aplicada — criar nova migration

## Estrutura de tabelas

### profiles
Criada automaticamente via trigger em auth.users
```sql
create table profiles (
  id uuid references auth.users primary key,
  email text not null,
  nome text,
  perfil text check (perfil in ('concurseiro', 'universitario', 'mestrando')),
  plano text not null default 'free' 
    check (plano in ('free', 'estudante', 'pro')),
  created_at timestamptz default now()
);
```
### subscriptions
Espelho do Stripe — atualizado via webhook
```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan text not null check (plan in ('free', 'estudante', 'pro')),
  status text not null, -- active, canceled, past_due, trialing
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### documents
```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  tipo text check (tipo in ('edital', 'pdf_generico', 'tcc')),
  nome_original text not null,
  storage_path text not null,
  texto_extraido text,
  metadata jsonb default '{}',
  processado boolean default false,
  created_at timestamptz default now()
);
```

### flashcards
```sql
create table flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  document_id uuid references documents(id),
  frente text not null,
  verso text not null,
  tags text[] default '{}',
  -- SM-2
  easiness_factor float default 2.5,
  repetitions int default 0,
  interval_days int default 1,
  next_review timestamptz default now(),
  created_at timestamptz default now()
);
```

### usage_tracking
Rate limiting e controle de custos

create table usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  feature text not null, -- 'edital', 'pdf', 'flashcard', 'fichamento'
  mes_ano text not null, -- '2025-06'
  quantidade int default 0,
  unique(user_id, feature, mes_ano)
);

### ai_usage_log
create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  feature text not null,
  model text not null,
  input_tokens int,
  output_tokens int,
  cache_read_tokens int default 0,
  custo_estimado_usd numeric(10,6),
  created_at timestamptz default now()
);

### documents_embeddings
Vetores para busca semântica (pgvector)

create table document_embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) not null,
  user_id uuid references profiles(id) not null,
  chunk_index int not null,
  chunk_text text not null,
  embedding vector(512), -- Voyage-3-lite usa 512 dimensões
  created_at timestamptz default now()
);

-- Index obrigatório para performance
create index on document_embeddings 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

### RLS 
-- Aplicar em TODAS as tabelas com user_id
alter table [tabela] enable row level security;

create policy "usuarios veem apenas seus dados"
  on [tabela] for all
  using (auth.uid() = user_id);

### Storage — buckets
documents/          ← PDFs enviados pelo usuário (privado)
  {user_id}/{document_id}/original.pdf

exports/            ← arquivos gerados (privado)
  {user_id}/{document_id}/flashcards.apkg
  {user_id}/{document_id}/fichamento.docx
  {user_id}/{document_id}/cronograma.ics

public/             ← assets públicos (logo, etc)

Usuário só acessa seu próprio folder (RLS via user_id no path)
Expiração de URL assinada: 1 hora para downloads
Limite por arquivo: 50MB

### Triggers uteis

```sql
-- Criar profile automaticamente ao cadastrar
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Atualizar updated_at automaticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```
### convenção de migration
-- Topo de cada arquivo de migration:
-- Migration: 001_initial_schema
-- Data: 2025-06-01
-- Rollback:
--   drop table if exists profiles cascade;
--   drop table if exists subscriptions cascade;
--   [etc...]
