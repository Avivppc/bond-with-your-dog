-- Website → Member area: the members' app look, home screen, banners and menu. One row with a draft
-- (what the editor saves) and a published copy (what members see), like the website theme.

create table if not exists public.member_area (
  id int primary key default 1 check (id = 1),
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object'),
  published jsonb not null default '{}'::jsonb check (jsonb_typeof(published) = 'object'),
  draft_rev int not null default 1,
  has_changes boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
insert into public.member_area (id) values (1) on conflict (id) do nothing;
alter table public.member_area enable row level security;
revoke all on public.member_area from anon, authenticated;
-- No policies: the app reads it on the server with the service role; staff write through actions.

-- Saves the draft only when the editor saw the latest one; null when someone else saved first.
create or replace function public.save_member_area_draft(p_rev int, p_settings jsonb, p_staff uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_rev int;
begin
  update public.member_area
     set draft = p_settings, draft_rev = draft_rev + 1, has_changes = true, updated_by = p_staff, updated_at = now()
   where id = 1 and draft_rev = p_rev
  returning draft_rev into v_rev;
  return v_rev;
end;
$$;
revoke all on function public.save_member_area_draft(int, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.save_member_area_draft(int, jsonb, uuid) to service_role;
