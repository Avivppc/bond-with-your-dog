-- ============================================================
-- 1. A practice session is saved once, even when the device retries (lost connection, double tap):
--    the browser sends a client_id per session, unique per member.
-- 2. Certificates carry the dog's name, fixed when the certificate is issued (the member's active
--    dog then), so a shared certificate shows "Dana & Luna" for anyone who opens it.
-- Tests: supabase/tests/member_app.test.sql
-- ============================================================

alter table public.practice_sessions add column if not exists client_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'practice_sessions_client_key') then
    -- Not partial, so PostgREST's on_conflict can target it; NULLs (older rows) never collide.
    alter table public.practice_sessions add constraint practice_sessions_client_key unique (user_id, client_id);
  end if;
end $$;

alter table public.certificates add column if not exists dog_name text check (char_length(dog_name) <= 40);

-- profiles.dog_name mirrors the active dog (20261012000100_dog_name_sync.sql).
create or replace function private.certificate_dog_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.dog_name is null then
    select nullif(trim(p.dog_name), '') into new.dog_name from public.profiles p where p.id = new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function private.certificate_dog_name() from public, anon, authenticated;

drop trigger if exists certificate_dog_name on public.certificates;
create trigger certificate_dog_name before insert on public.certificates
  for each row execute function private.certificate_dog_name();

update public.certificates c
   set dog_name = left(nullif(trim(p.dog_name), ''), 40)
  from public.profiles p
 where p.id = c.user_id and c.dog_name is null;

-- The return type changes, so the function is replaced, not altered.
drop function if exists public.verify_certificate(text);
create function public.verify_certificate(p_code text)
returns table (code text, student_name text, course_title text, issued_at timestamptz, dog_name text)
language sql
stable
security definer
set search_path = public
as $$
  select c.code, c.student_name, c.course_title, c.issued_at, c.dog_name
  from public.certificates c
  where c.code = p_code;
$$;
revoke all on function public.verify_certificate(text) from public, anon, authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated, service_role;
