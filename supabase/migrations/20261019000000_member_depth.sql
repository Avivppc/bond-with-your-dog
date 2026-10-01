-- ============================================================
-- Member depth
--   1. Skill-level history: dog_skill_events (append-only, written by a trigger on dog_skills)
--   2. Chapters (timestamps) on Live Q&A recordings: community_meetups.recording_chapters
--   3. Photos on member stories: support_requests.media_paths (community-media bucket)
-- Tests: supabase/tests/member_depth.test.sql
-- ============================================================

-- ── 1. Skill-level history ──────────────────────────────────
create table if not exists public.dog_skill_events (
  id bigint generated always as identity primary key,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  move_id uuid not null references public.moves(id) on delete cascade,
  from_level text check (from_level in ('learning', 'reliable', 'performance')),
  to_level text not null check (to_level in ('learning', 'reliable', 'performance')),
  set_by text not null check (set_by in ('member', 'coach')),
  created_at timestamptz not null default now()
);
create index if not exists dog_skill_events_dog on public.dog_skill_events (dog_id, created_at desc);
alter table public.dog_skill_events enable row level security;
drop policy if exists dog_skill_events_read_own on public.dog_skill_events;
create policy dog_skill_events_read_own on public.dog_skill_events for select to authenticated
  using (exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = auth.uid()));
-- Append-only: only the trigger below writes; rows leave with their dog or move (cascade).
revoke insert, update, delete, truncate on public.dog_skill_events from anon, authenticated, service_role;

-- One event per level change (a new skill, or a different level on an existing one).
create or replace function private.log_dog_skill_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.level is not distinct from new.level then
    return null;
  end if;
  insert into public.dog_skill_events (dog_id, move_id, from_level, to_level, set_by)
  values (new.dog_id, new.move_id, case when tg_op = 'UPDATE' then old.level end, new.level, new.set_by);
  return null;
end;
$$;

-- Skills set before this migration get one event each (dated by their last change); idempotent.
create or replace function private.backfill_dog_skill_events()
returns int language sql security definer set search_path = public as $$
  with added as (
    insert into public.dog_skill_events (dog_id, move_id, from_level, to_level, set_by, created_at)
    select s.dog_id, s.move_id, null, s.level, s.set_by, s.updated_at
      from public.dog_skills s
     where not exists (select 1 from public.dog_skill_events e where e.dog_id = s.dog_id and e.move_id = s.move_id)
    returning 1
  )
  select count(*)::int from added;
$$;
select private.backfill_dog_skill_events();

drop trigger if exists dog_skill_events_log on public.dog_skills;
create trigger dog_skill_events_log after insert or update on public.dog_skills
  for each row execute function private.log_dog_skill_event();

-- ── 2. Chapters on Q&A recordings ───────────────────────────
-- [{ "t": seconds, "title": "…" }]: up to 50, whole seconds 0–36000 (600 min), strictly
-- ascending, titles 1–120 characters without surrounding spaces, no other keys.
-- Used by a CHECK constraint, so it stays executable by the API roles (it only inspects its input).
create or replace function private.recording_chapters_valid(p_chapters jsonb)
returns boolean language plpgsql immutable as $$
declare
  v_item jsonb;
  v_t numeric;
  v_title text;
  v_prev numeric := -1;
begin
  if p_chapters is null or jsonb_typeof(p_chapters) <> 'array' or jsonb_array_length(p_chapters) > 50 then
    return false;
  end if;
  for v_item in select e.value from jsonb_array_elements(p_chapters) with ordinality as e(value, n) order by e.n loop
    if jsonb_typeof(v_item) <> 'object'
       or (select count(*) from jsonb_object_keys(v_item)) <> 2
       or jsonb_typeof(v_item -> 't') is distinct from 'number'
       or jsonb_typeof(v_item -> 'title') is distinct from 'string' then
      return false;
    end if;
    v_t := (v_item ->> 't')::numeric;
    v_title := v_item ->> 'title';
    if v_t <> trunc(v_t) or v_t < 0 or v_t > 36000 or v_t <= v_prev
       or char_length(v_title) not between 1 and 120 or v_title <> btrim(v_title) then
      return false;
    end if;
    v_prev := v_t;
  end loop;
  return true;
end;
$$;

alter table public.community_meetups
  add column if not exists recording_chapters jsonb not null default '[]'::jsonb;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_meetups_recording_chapters_check') then
    alter table public.community_meetups add constraint community_meetups_recording_chapters_check
      check (private.recording_chapters_valid(recording_chapters));
  end if;
end $$;
grant select (recording_chapters) on public.community_meetups to authenticated;

-- ── 3. Photos on member stories ─────────────────────────────
-- Up to 3 distinct paths in the private community-media bucket, under `<user_id>/stories/`, on
-- stories only. A row whose member was deleted (user_id set null) keeps passing.
-- Used by a CHECK constraint, so it stays executable by the API roles (it only inspects its input).
create or replace function private.support_media_paths_valid(p_user uuid, p_kind text, p_paths text[])
returns boolean language sql immutable as $$
  select p_paths is not null
     and cardinality(p_paths) <= 3
     and array_position(p_paths, null) is null
     and cardinality(p_paths) = (select count(distinct x) from unnest(p_paths) x)
     and (cardinality(p_paths) = 0
          or (p_kind = 'story'
              and (p_user is null
                   or not exists (select 1 from unnest(p_paths) x
                                   where x !~ ('^' || p_user::text || '/stories/[A-Za-z0-9_-]{1,80}\.(jpg|png|webp|heic)$')))));
$$;

alter table public.support_requests
  add column if not exists media_paths text[] not null default '{}';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'support_requests_media_paths_check') then
    alter table public.support_requests add constraint support_requests_media_paths_check
      check (private.support_media_paths_valid(user_id, kind, media_paths));
  end if;
end $$;

drop function if exists public.submit_support_request(text, text, text, text, boolean);
create or replace function public.submit_support_request(
  p_kind text, p_subject text, p_body text, p_page_url text, p_consent_public boolean, p_media_paths text[] default '{}'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_paths text[] := coalesce(p_media_paths, '{}');
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if (select count(*) from public.support_requests where user_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many requests today, try again tomorrow' using errcode = '54000';
  end if;
  if cardinality(v_paths) > 0 and p_kind is distinct from 'story' then
    raise exception 'only stories can include photos' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_paths) x where x is null or x not like auth.uid()::text || '/stories/%') then
    raise exception 'photos must be your own uploads' using errcode = '42501';
  end if;
  insert into public.support_requests (user_id, kind, subject, body, page_url, consent_public, media_paths)
  values (auth.uid(), p_kind, nullif(trim(p_subject), ''), trim(p_body), p_page_url, coalesce(p_consent_public, false), v_paths)
  returning id into v_id;
  return v_id;
end;
$$;

-- The Inbox list gains the story photos (return type changes, so drop first).
drop function if exists public.admin_list_support_requests(text, text, int, int);
create or replace function public.admin_list_support_requests(p_kind text, p_status text, p_limit int, p_offset int)
returns table (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  kind text,
  subject text,
  body text,
  page_url text,
  consent_public boolean,
  status text,
  answer text,
  answered_at timestamptz,
  answered_by_email text,
  created_at timestamptz,
  media_paths text[],
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.user_id, u.email::text, p.full_name, r.kind, r.subject, r.body, r.page_url, r.consent_public,
         r.status, r.answer, r.answered_at, a.email::text, r.created_at, r.media_paths,
         count(*) over ()
    from public.support_requests r
    left join auth.users u on u.id = r.user_id
    left join public.profiles p on p.id = r.user_id
    left join auth.users a on a.id = r.answered_by
   where (p_kind is null or r.kind = p_kind)
     and (p_status is null or r.status = p_status)
   order by r.created_at desc
   limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Story photos may be HEIC (iPhone); the bucket otherwise stays as created in the community migration.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    update storage.buckets
       set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
     where id = 'community-media';
  end if;
end $$;

-- ── Grants ──────────────────────────────────────────────────
revoke all on function public.submit_support_request(text, text, text, text, boolean, text[]) from public, anon;
grant execute on function public.submit_support_request(text, text, text, text, boolean, text[]) to authenticated;
revoke all on function public.admin_list_support_requests(text, text, int, int) from public, anon, authenticated;
grant execute on function public.admin_list_support_requests(text, text, int, int) to service_role;
revoke all on function private.log_dog_skill_event() from public, anon, authenticated;
revoke all on function private.backfill_dog_skill_events() from public, anon, authenticated;
