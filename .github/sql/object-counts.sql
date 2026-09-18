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
order by 1;