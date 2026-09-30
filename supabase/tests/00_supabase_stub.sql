-- Minimal stand-in for the pieces of Supabase that our migrations rely on,
-- so they can run against a throwaway local Postgres (see scripts/db-test.sh).
-- Never apply this file to a real Supabase project.

-- Supabase installs extensions into `extensions`, which is NOT on the search_path
-- of functions declared with `set search_path = public`.
create schema if not exists extensions;
create extension if not exists pgcrypto schema extensions;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Supabase derives these from the request JWT; tests set request.jwt.claims.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub', '')::uuid
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- Mirror Supabase's default privileges: API roles get table access, RLS decides rows.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
-- Supabase also grants EXECUTE on new public functions to the API roles directly,
-- so `revoke ... from public` alone does not lock a function down.
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
