-- ============================================================
-- Access invites: staff grant an offer to an email address. If the person has no
-- account yet (e.g. students migrating from Kajabi), the grant waits and is claimed
-- on sign-in with that VERIFIED email.
-- Tests: supabase/tests/access_invites.test.sql
-- ============================================================

create table if not exists public.access_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  offer_id uuid not null references public.offers(id) on delete cascade,
  days_of_access int check (days_of_access > 0),   -- null = lifetime
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null
);
create unique index if not exists access_invites_pending_key
  on public.access_invites (lower(email), offer_id) where claimed_at is null;
alter table public.access_invites enable row level security;
revoke all on public.access_invites from anon, authenticated;

-- Server-side lookup for the admin "grant by email" form.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
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
  select lower(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
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

revoke all on function public.find_user_id_by_email(text) from public, anon, authenticated;
revoke all on function public.claim_access_invites() from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;
grant execute on function public.claim_access_invites() to authenticated;
