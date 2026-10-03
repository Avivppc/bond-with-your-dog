-- Website editor: pages made of sections (each with a draft and a published copy), a version per
-- publish, the theme (colors, fonts, logo, header and footer), and a public bucket for images.
-- Built-in pages (home, about, …) get a row the first time someone edits them; until then the site
-- shows the hand-built defaults from the code.

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  -- The address: "" is the home page, otherwise one lowercase word or words-with-dashes.
  slug text not null check (slug = '' or (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60)),
  title text not null check (char_length(title) between 1 and 120),
  -- Built-in pages can't be renamed to another address or deleted.
  system_key text unique check (system_key in ('home', 'about', 'courses', 'stories', 'privacy', 'terms', 'refund')),
  draft jsonb not null default '{"sections": [], "assistant": false}'::jsonb check (jsonb_typeof(draft) = 'object'),
  draft_seo jsonb not null default '{"title": "", "description": "", "image": ""}'::jsonb check (jsonb_typeof(draft_seo) = 'object'),
  published jsonb check (published is null or jsonb_typeof(published) = 'object'),
  published_seo jsonb,
  published_title text,
  -- draft: never published · published: live · hidden: was live, now off the site
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  -- Bumped on every draft save; a save from a stale editor tab is refused.
  draft_rev int not null default 1,
  -- The draft has changes the live page doesn't.
  has_changes boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create unique index if not exists site_pages_slug_once on public.site_pages (slug);

create table if not exists public.site_page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.site_pages(id) on delete cascade,
  title text not null,
  doc jsonb not null,
  seo jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists site_page_versions_page on public.site_page_versions (page_id, created_at desc);

create table if not exists public.site_theme (
  id int primary key default 1 check (id = 1),
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object'),
  published jsonb not null default '{}'::jsonb check (jsonb_typeof(published) = 'object'),
  draft_rev int not null default 1,
  has_changes boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
insert into public.site_theme (id) values (1) on conflict (id) do nothing;

alter table public.site_pages enable row level security;
alter table public.site_page_versions enable row level security;
alter table public.site_theme enable row level security;
revoke all on public.site_pages, public.site_page_versions, public.site_theme from anon, authenticated;
-- No policies: the site reads published pages on the server with the service role, and only
-- staff (through server actions) write them.

-- Saves a draft only when the editor saw the latest one; returns the new revision, or null when
-- someone else saved in between (the editor then asks to reload).
create or replace function public.save_site_page_draft(p_id uuid, p_rev int, p_doc jsonb, p_seo jsonb, p_title text, p_slug text, p_staff uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_rev int;
begin
  update public.site_pages
     set draft = p_doc, draft_seo = p_seo, title = p_title,
         slug = case when system_key is null then p_slug else slug end,
         draft_rev = draft_rev + 1, has_changes = true, updated_by = p_staff, updated_at = now()
   where id = p_id and draft_rev = p_rev
  returning draft_rev into v_rev;
  return v_rev;
end;
$$;

create or replace function public.save_site_theme_draft(p_rev int, p_theme jsonb, p_staff uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_rev int;
begin
  update public.site_theme
     set draft = p_theme, draft_rev = draft_rev + 1, has_changes = true, updated_by = p_staff, updated_at = now()
   where id = 1 and draft_rev = p_rev
  returning draft_rev into v_rev;
  return v_rev;
end;
$$;

revoke all on function public.save_site_page_draft(uuid, int, jsonb, jsonb, text, text, uuid) from public, anon, authenticated;
revoke all on function public.save_site_theme_draft(int, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.save_site_page_draft(uuid, int, jsonb, jsonb, text, text, uuid) to service_role;
grant execute on function public.save_site_theme_draft(int, jsonb, uuid) to service_role;

-- Images for the website (public; uploaded by staff through a server action).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('site-media', 'site-media', true, 5242880, array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;
