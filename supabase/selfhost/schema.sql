-- Veritas Vector Garden — idempotent schema for the OpenShip self-hosted Supabase
-- (homelab 192.168.1.42). Safe to re-run: every statement is guarded.
--
-- Embeddings: 768 dimensions (Ollama `embeddinggemma` on the homelab) — the
-- chunks.embedding column and match_chunks() signature are sized for that.
-- Auth: real Supabase auth (auto-confirm); RLS requires an authenticated user.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid not null default gen_random_uuid() primary key,
  case_number text,
  title text,
  description text,
  status text,
  user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vector_bases (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  openai_key_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid not null default gen_random_uuid() primary key,
  base_id uuid references public.vector_bases(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  file_name text,
  file_path text,
  file_size bigint,
  mime_type text,
  status text default 'uploaded',
  chunk_count integer default 0,
  user_id uuid,
  uploaded_at timestamptz not null default now()
);

-- every document belongs to a base or a case (mirrors the original app constraint)
do $$ begin
  alter table public.documents add constraint documents_case_or_base_check
    check (case_id is not null or base_id is not null);
exception when duplicate_object or others then null; end $$;

create table if not exists public.chunks (
  id uuid not null default gen_random_uuid() primary key,
  document_id uuid not null references public.documents(id) on delete cascade,
  content text not null,
  embedding vector(768),
  metadata jsonb,
  page_no integer,
  created_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id uuid not null default gen_random_uuid() primary key,
  label text not null,
  key_hash text not null,
  scopes jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_vector_bases_updated_at on public.vector_bases;
create trigger update_vector_bases_updated_at
  before update on public.vector_bases
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_cases_updated_at on public.cases;
create trigger update_cases_updated_at
  before update on public.cases
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Vector similarity search (768-dim, local embeddings)
-- ---------------------------------------------------------------------------

create or replace function match_chunks(
  query_embedding vector(768),
  match_threshold float default 0.3,
  match_count int default 5,
  base_id_filter uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    chunks.id,
    chunks.document_id,
    chunks.content,
    chunks.metadata,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  inner join documents on chunks.document_id = documents.id
  where
    (base_id_filter is null or documents.base_id = base_id_filter)
    and chunks.embedding is not null
    and 1 - (chunks.embedding <=> query_embedding) > match_threshold
  order by chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

create index if not exists chunks_embedding_idx on public.chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------------------------
-- RLS — authenticated users only (the app signs in; edge functions use the
-- service role and bypass RLS)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.vector_bases enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.api_keys enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','cases','vector_bases','documents','chunks','api_keys'] loop
    execute format('drop policy if exists "Allow all access to %s" on public.%s', t, t);
    execute format('drop policy if exists "Anyone can view documents" on public.%s', t);
    execute format('drop policy if exists "Anyone can insert documents" on public.%s', t);
    execute format('drop policy if exists "Anyone can update documents" on public.%s', t);
    execute format('drop policy if exists "Anyone can delete documents" on public.%s', t);
    execute format('drop policy if exists "auth_all_%s" on public.%s', t, t);
    execute format('create policy "auth_all_%s" on public.%s for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage bucket for uploads
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', false)
on conflict (id) do nothing;

do $$
declare p text;
begin
  foreach p in array array['upload to','view','update','delete'] loop
    execute format('drop policy if exists "Anyone can %s case-documents" on storage.objects', p);
    execute format('drop policy if exists "Anyone can %s documents" on storage.objects', p);
  end loop;
  drop policy if exists "auth_case_documents" on storage.objects;
  create policy "auth_case_documents" on storage.objects
    for all to authenticated
    using (bucket_id = 'case-documents')
    with check (bucket_id = 'case-documents');
end $$;
