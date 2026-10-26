-- Same no-implicit-table/sequence-grant model as the directory/Tawod tests.
create role anon; create role authenticated; create role service_role bypassrls;
grant usage on schema public to anon,authenticated,service_role;
alter default privileges in schema public revoke all on tables from public,anon,authenticated,service_role;
alter default privileges in schema public revoke all on sequences from public,anon,authenticated,service_role;
create schema extensions;
create extension pgcrypto with schema extensions;
grant usage on schema extensions to service_role;
grant execute on all functions in schema extensions to service_role;
create role authenticator login noinherit password 'isolated-permissions-rest-only';
grant anon,authenticated,service_role to authenticator;
-- A new table and its identity sequence prove the test has no automatic grants.
create table public.no_implicit_grants_probe(id bigint generated always as identity);
do $$ declare r text; begin
  foreach r in array array['anon','authenticated','service_role'] loop
    assert not has_table_privilege(r,'public.no_implicit_grants_probe','select,insert,update,delete'), 'implicit table privileges';
    assert not has_sequence_privilege(r,'public.no_implicit_grants_probe_id_seq','usage,select'), 'implicit sequence privileges';
  end loop;
end $$;
drop table public.no_implicit_grants_probe;
