-- Settings → General (the academy's name, contact email and social links, shown on the public site)
-- and Settings → Notifications (which events email the team).

create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  academy_name text not null default 'Bonded' check (char_length(academy_name) between 1 and 80),
  contact_email text not null default 'info.bonded@gmail.com'
    check (char_length(contact_email) <= 200 and contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- {instagram, youtube, facebook, tiktok, whatsapp}: https links, checked by the app.
  social jsonb not null default '{}'::jsonb check (jsonb_typeof(social) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
alter table public.site_settings enable row level security;
drop policy if exists "Anyone reads the site settings" on public.site_settings;
create policy "Anyone reads the site settings" on public.site_settings for select to anon, authenticated using (true);
-- Only the service role (the admin's server actions) writes it.
revoke insert, update, delete, truncate on public.site_settings from anon, authenticated;

-- Which events email the team (team_email, else COACH_INBOX). Unknown keys are ignored by the app.
alter table public.email_settings
  add column if not exists notify jsonb not null
    default '{"orders": true, "videos": true, "inbox": true, "questions": true, "leads": false}'::jsonb
    check (jsonb_typeof(notify) = 'object');
