-- ---------------------------------------------------------------------------
-- Minimal stand-ins for the objects Supabase manages for us, so that
-- supabase/migrations/001_initial.sql and 002_v2.sql can be replayed against a
-- throw-away PostgreSQL instance in CI.
--
-- Audited references in those two files:
--   roles    anon, authenticated          (RLS policies, GRANT EXECUTE)
--   auth.uid()                            (68 + 11 usages)
--   auth.users                            (profiles.id -> auth.users.id FK)
--   storage.objects                       (bucket_id, name, owner)
--   storage.buckets                       (id, name, public)
--   storage.foldername()                  (storage policies)
--   publication supabase_realtime         (001: ALTER PUBLICATION ... ADD TABLE)
--
-- A scratch PostgreSQL has none of these. Safe to run repeatedly: the roles are
-- created through \gexec (CREATE ROLE has no IF NOT EXISTS) and everything else
-- is IF NOT EXISTS / CREATE OR REPLACE.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

select 'create role anon nologin'
where not exists (select 1 from pg_roles where rolname = 'anon')\gexec
select 'create role authenticated nologin'
where not exists (select 1 from pg_roles where rolname = 'authenticated')\gexec
select 'create role service_role nologin'
where not exists (select 1 from pg_roles where rolname = 'service_role')\gexec

-- ─── auth (GoTrue) ──────────────────────────────────────────────────────────
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- ── storage (Storage API) ─────────────────────────────────────────────────
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  metadata jsonb
);

create or replace function storage.foldername(name text) returns text[]
language plpgsql
immutable
as $$
declare
  parts text[];
begin
  parts := string_to_array(name, '/');
  if parts is null or array_length(parts, 1) is null then
    return '{}';
  end if;
  return parts[1:array_length(parts, 1) - 1];
end;
$$;

-- ── Realtime publication ──────────────────────────────────────────────────
drop publication if exists supabase_realtime;
create publication supabase_realtime;