-- Object counts, used to prove that a second migration pass changes nothing.
-- Run as: psql -d <db> -f .github/sql/object-counts.sql
\pset format unaligned
\pset tuples_only on
\pset fieldsep '|'

select 'functions_public', count(*)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
union all
select 'indexes_public', count(*) from pg_indexes where schemaname = 'public'
union all
select 'policies_public', count(*) from pg_policies where schemaname = 'public'
union all
select 'policies_storage', count(*) from pg_policies where schemaname = 'storage'
union all
select 'tables_public', count(*) from pg_tables where schemaname = 'public'
union all
select 'triggers_public_and_storage', count(*)
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
 where not t.tgisinternal
   and n.nspname in ('public', 'storage')
union all
-- RLS coverage guards (see supabase/migrations/059).
--
-- rls_off_tables MUST be 0. A PostgreSQL policy is INERT until
-- `ENABLE ROW LEVEL SECURITY` is set on its table, so a table with
-- well-authored policies but no RLS enabled is fully readable/writable by
-- anon through PostgREST. 003_v3.sql shipped exactly that bug for five
-- tables; migration 059 fixes it and this assertion makes it a CI failure
-- rather than a silent production exposure.
select 'rls_off_tables', count(*)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relkind = 'r'
   and not c.relrowsecurity
union all
-- RLS enabled but no policy = accidental deny-all for every role. Surfaced so
-- it is visible in the pass-1/pass-2 diff instead of silently breaking reads.
select 'rls_on_tables_without_policies', count(*)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relkind = 'r'
   and c.relrowsecurity
   and not exists (
     select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = c.relname
   )
order by 1;