-- Shared assertion helpers for supabase/tests/*.test.sql (loaded once by scripts/db-test.sh).
create schema if not exists t;
grant usage on schema t to anon, authenticated;

create or replace function t.ok(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'ASSERTION FAILED: %', msg; end if;
end $$;

-- Passes only when the statement fails with the given SQLSTATE; any other error fails the test.
create or replace function t.fails_with(stmt text, expected_state text, msg text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise exception 'WRONG ERROR (% %) for: %', sqlstate, sqlerrm, msg;
  end;
  raise exception 'EXPECTED FAILURE (%) BUT SUCCEEDED: %', expected_state, msg;
end $$;

-- Passes only when the statement is DENIED (permission/RLS 42501, unauthenticated 28000).
create or replace function t.denied(stmt text, msg text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception
    when sqlstate '42501' or sqlstate '28000' then return;
    when others then raise exception 'WRONG ERROR (% %) for: %', sqlstate, sqlerrm, msg;
  end;
  raise exception 'EXPECTED DENIAL BUT SUCCEEDED: %', msg;
end $$;

create or replace function t.login(uid uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
$$;

grant execute on all functions in schema t to anon, authenticated;
