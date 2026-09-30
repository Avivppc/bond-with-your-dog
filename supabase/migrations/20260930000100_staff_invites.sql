-- ============================================================
-- Stage A2: staff invites
-- The owner invites the client's team by email (admin UI, service role).
-- On sign-in, claim_staff_invite() turns a pending invite into a staff role —
-- only when the signed-in user's email is verified, so nobody can claim an
-- invite by signing up with someone else's address.
-- Tests: supabase/tests/staff_invites.test.sql
-- ============================================================

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('owner', 'editor')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);
create unique index if not exists staff_invites_email_key on public.staff_invites (lower(email));
alter table public.staff_invites enable row level security;
-- No policies: only the service role (admin UI) and the claim function touch invites.
revoke all on public.staff_invites from anon, authenticated;

create or replace function public.claim_staff_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.staff_invites%rowtype;
  v_existing text;
begin
  if v_uid is null then return null; end if;

  select role into v_existing from public.staff_members where user_id = v_uid;
  if v_existing is not null then return v_existing; end if;

  select lower(email) into v_email
    from auth.users
   where id = v_uid and email_confirmed_at is not null;
  if v_email is null then return null; end if;

  select * into v_invite
    from public.staff_invites
   where lower(email) = v_email and accepted_at is null
   for update;
  if v_invite.id is null then return null; end if;

  insert into public.staff_members (user_id, role, invited_by)
  values (v_uid, v_invite.role, v_invite.invited_by)
  on conflict (user_id) do nothing;

  update public.staff_invites
     set accepted_at = now(), accepted_by = v_uid
   where id = v_invite.id;

  return v_invite.role;
end;
$$;

revoke all on function public.claim_staff_invite() from public, anon, authenticated;
grant execute on function public.claim_staff_invite() to authenticated;
