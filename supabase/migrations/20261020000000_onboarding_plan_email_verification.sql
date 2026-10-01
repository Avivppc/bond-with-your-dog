-- ============================================================
-- Onboarding course choice + deferred email verification
--
-- 1. profiles.chosen_course_id: the chapter a member picked in onboarding
--    (Foundations by default). Choosing is not buying; access still comes
--    from enrollments.
--
-- 2. email_verifications: proof that a member controls their inbox.
--    Signup now logs people straight in ("Confirm email" off in Supabase),
--    which marks auth.users.email_confirmed_at for everyone. Anything granted
--    BY EMAIL (staff invites, access invites, admin grants) must check this
--    table instead. Only the server writes it, after the member opened a
--    one-time link we emailed them (or signed in with Google).
--    Apply BEFORE turning "Confirm email" off.
-- Tests: supabase/tests/email_verification.test.sql
-- ============================================================

alter table public.profiles
  add column if not exists chosen_course_id text references public.courses(id) on delete set null;

create table if not exists public.email_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  verified_at timestamptz not null default now()
);
alter table public.email_verifications enable row level security;
-- No policies: only the service role writes, and the functions below read.
revoke all on public.email_verifications from anon, authenticated;

-- Everyone confirmed so far proved their inbox while "Confirm email" was on.
insert into public.email_verifications (user_id, email, verified_at)
select id, lower(email), email_confirmed_at
  from auth.users
 where email_confirmed_at is not null and email is not null
on conflict (user_id) do nothing;

-- The member's current email, lower-cased, only if it is verified.
-- Changing the account email voids the proof until it is verified again.
create or replace function public.verified_email(p_uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(u.email)
    from auth.users u
    join public.email_verifications v on v.user_id = u.id and v.email = lower(u.email)
   where u.id = p_uid;
$$;

create or replace function public.my_email_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.verified_email(auth.uid()) is not null;
$$;

-- Admin "grant by email": the account for an email and whether its owner is proven.
create or replace function public.find_account_by_email(p_email text)
returns table (user_id uuid, verified boolean)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, public.verified_email(u.id) is not null
    from auth.users u
   where lower(u.email) = lower(trim(p_email))
   limit 1;
$$;

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

  v_email := public.verified_email(v_uid);
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

create or replace function public.claim_access_invites()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.access_invites%rowtype;
  v_count int := 0;
begin
  if v_uid is null then return 0; end if;
  v_email := public.verified_email(v_uid);
  if v_email is null then return 0; end if;

  for v_invite in
    select * from public.access_invites
     where lower(email) = v_email and claimed_at is null
     for update
  loop
    perform public.grant_offer_access(
      v_uid, v_invite.offer_id, 'grant', null,
      case when v_invite.days_of_access is null then null else now() + make_interval(days => v_invite.days_of_access) end
    );
    update public.access_invites set claimed_at = now(), claimed_by = v_uid where id = v_invite.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.verified_email(uuid) from public, anon, authenticated;
revoke all on function public.my_email_verified() from public, anon;
revoke all on function public.find_account_by_email(text) from public, anon, authenticated;
grant execute on function public.verified_email(uuid) to service_role;
grant execute on function public.my_email_verified() to authenticated;
grant execute on function public.find_account_by_email(text) to service_role;
