-- ============================================================
-- Proof of marketing-email consent, next to the yes itself.
-- profiles.marketing_opt_in / marketing_opt_in_at already say THAT and WHEN a member agreed;
-- these columns say WHERE they agreed, from which country, and whether the box came pre-ticked
-- (it does outside opt-in countries, see src/lib/auth/marketing-regions.ts).
-- Apply AFTER 20261120000000_coaching.sql
-- ============================================================

alter table public.profiles
  add column if not exists marketing_opt_in_source text
    check (marketing_opt_in_source in ('signup_form', 'signup_google', 'settings')),
  add column if not exists marketing_opt_in_country text
    check (marketing_opt_in_country ~ '^[A-Z]{2}$'),
  add column if not exists marketing_opt_in_prechecked boolean;

-- A "no" carries no proof: whoever turns marketing off (settings, an admin tool, SQL), the record goes
-- with it. A "yes" without a source (agreed before this migration) stays as it was.
create or replace function public.clear_marketing_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.marketing_opt_in then
    new.marketing_opt_in_at := null;
    new.marketing_opt_in_source := null;
    new.marketing_opt_in_country := null;
    new.marketing_opt_in_prechecked := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.clear_marketing_evidence() from public, anon, authenticated;

drop trigger if exists profiles_clear_marketing_evidence on public.profiles;
create trigger profiles_clear_marketing_evidence
  before insert or update on public.profiles
  for each row execute function public.clear_marketing_evidence();

-- Copy the consent and its proof from the signup metadata into the profile row. The proof is read
-- defensively: anything unexpected becomes null instead of failing the whole signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_opt_in boolean := coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false);
  v_source text := new.raw_user_meta_data->>'marketing_opt_in_source';
  v_country text := upper(new.raw_user_meta_data->>'marketing_opt_in_country');
begin
  insert into public.profiles (
    id, full_name, marketing_opt_in, marketing_opt_in_at,
    marketing_opt_in_source, marketing_opt_in_country, marketing_opt_in_prechecked
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_opt_in,
    case when v_opt_in then now() else null end,
    case when v_opt_in and v_source in ('signup_form', 'signup_google', 'settings') then v_source else null end,
    case when v_opt_in and v_country ~ '^[A-Z]{2}$' then v_country else null end,
    case when v_opt_in then (new.raw_user_meta_data->>'marketing_opt_in_prechecked') = 'true' else null end
  );
  return new;
end;
$$;
