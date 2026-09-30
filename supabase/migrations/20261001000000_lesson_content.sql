-- ============================================================
-- Stage A3: lesson content
--   * lesson_videos — the video reference (Vimeo id/hash or Mux playback id),
--     server-only; students get a player URL/token only after can_access_lesson()
--   * lesson_files  — downloadable files (private storage), metadata follows lesson access
--   * lessons.body_html (sanitized on write by the admin), thumbnail_url
--   * events become append-only (review follow-up)
-- Tests: supabase/tests/lesson_content.test.sql
-- ============================================================

alter table public.lessons add column if not exists body_html text;
alter table public.lessons add column if not exists thumbnail_url text;

-- ── Video references (server-only) ──────────────────────────
create table if not exists public.lesson_videos (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  provider text not null check (provider in ('vimeo', 'mux')),
  external_id text not null,                 -- Vimeo video id | Mux playback id
  external_hash text,                        -- Vimeo unlisted hash (h=...)
  playback_policy text not null default 'signed' check (playback_policy in ('signed', 'public')),  -- Mux only
  duration_seconds int,
  thumbnail_url text,
  source_url text,                           -- what the editor pasted
  updated_at timestamptz not null default now()
);
alter table public.lesson_videos enable row level security;
revoke all on public.lesson_videos from anon, authenticated;

-- Move existing Mux references out of the publicly readable lessons table.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'lessons' and column_name = 'mux_playback_id') then
    insert into public.lesson_videos (lesson_id, provider, external_id, playback_policy)
    select id, 'mux', mux_playback_id, coalesce(mux_playback_policy, 'signed')
      from public.lessons
     where mux_playback_id is not null and mux_playback_id <> ''
    on conflict (lesson_id) do nothing;
    alter table public.lessons drop column mux_playback_id;
    alter table public.lessons drop column if exists mux_playback_policy;
  end if;
end $$;

-- ── Downloadable files ──────────────────────────────────────
create table if not exists public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_name text not null,
  storage_path text not null,                -- object path in the private "lesson-files" bucket
  size_bytes bigint,
  content_type text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_lesson_files_lesson on public.lesson_files(lesson_id, position);
alter table public.lesson_files enable row level security;

drop policy if exists "lesson_files_read_accessible" on public.lesson_files;
create policy "lesson_files_read_accessible"
  on public.lesson_files for select
  using (public.can_access_lesson(lesson_id));
revoke insert, update, delete, truncate on public.lesson_files from anon, authenticated;

-- Private bucket for lesson downloads (only when running on Supabase, which has the storage schema).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('lesson-files', 'lesson-files', false)
    on conflict (id) do nothing;
  end if;
end $$;

-- ── Events: append-only ─────────────────────────────────────
create or replace function private.forbid_event_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'events are append-only' using errcode = 'P0001';
end;
$$;
drop trigger if exists trg_events_append_only on public.events;
create trigger trg_events_append_only
  before update or delete on public.events
  for each row execute function private.forbid_event_changes();
