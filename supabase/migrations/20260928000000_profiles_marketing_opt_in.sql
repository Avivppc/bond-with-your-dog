-- ============================================================
-- Email marketing consent on signup
-- Apply AFTER 20260924000000_quiz_leads_tier_rename.sql
-- ============================================================

alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz;

-- Copy the consent flag from the signup metadata into the profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_opt_in boolean := coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false);
begin
  insert into public.profiles (id, full_name, marketing_opt_in, marketing_opt_in_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_opt_in,
    case when v_opt_in then now() else null end
  );
  return new;
end;
$$;
