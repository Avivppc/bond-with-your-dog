-- "Share your story" on the public site (/stories/share): visitors without an account send a story
-- with up to 3 photos; it lands in Admin → Inbox → Stories next to the members' ones.
--   1. support_requests.contact_name / contact_email   who sent a visitor's story (members have an account)
--   2. guest photo paths                               `guest/<upload session>/stories/<id>.<ext>` in the
--                                                      private community-media bucket
--   3. story_upload_tickets                            one row per photo upload a visitor started:
--                                                      limits uploads per address and proves a path was ours
--                                                      (issue_story_upload_ticket; stale_story_uploads lists
--                                                      the ones never sent, for the hourly clean-up)
--   4. admin_list_support_requests                     shows the visitor's name and email
--   5. submit_visitor_story                            saves one, with its limits
-- Only the server (service role) writes any of this, after Cloudflare Turnstile.

-- ── 1. Who sent it ──────────────────────────────────────────────────────────
alter table public.support_requests
  add column if not exists contact_name text check (char_length(contact_name) between 1 and 80),
  add column if not exists contact_email text check (char_length(contact_email) between 3 and 254),
  -- The visitor's address, only to limit how many stories one address sends; never shown.
  add column if not exists contact_ip text check (char_length(contact_ip) <= 100);

-- ── 2. Visitors' photos live under guest/ ───────────────────────────────────
create or replace function private.guest_story_paths_valid(p_paths text[])
returns boolean language sql immutable set search_path = '' as $$
  select not exists (select 1 from unnest(coalesce(p_paths, '{}')) x
                      where x !~ '^guest/[0-9a-f-]{36}/stories/[A-Za-z0-9_-]{1,80}\.(jpg|png|webp|heic)$');
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'support_requests_visitor_story') then
    -- A visitor's row: a story, no account, and only guest photo paths.
    alter table public.support_requests add constraint support_requests_visitor_story
      check (contact_email is null or (user_id is null and kind = 'story' and contact_name is not null
                                       and private.guest_story_paths_valid(media_paths)));
  end if;
end $$;

-- ── 3. Upload tickets ───────────────────────────────────────────────────────
create table if not exists public.story_upload_tickets (
  path text primary key check (char_length(path) <= 300),
  ip text check (char_length(ip) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists story_upload_tickets_recent on public.story_upload_tickets (created_at desc);
alter table public.story_upload_tickets enable row level security;
revoke all on public.story_upload_tickets from anon, authenticated;

-- One more photo upload for a visitor, within the limits: 12 an hour per address, 150 an hour in
-- all. The lock makes simultaneous requests count one after another.
create or replace function public.issue_story_upload_ticket(p_path text, p_ip text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.guest_story_paths_valid(array[p_path]) then
    raise exception 'not a visitor photo path' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('story_upload_tickets'));
  if (select count(*) from public.story_upload_tickets where created_at > now() - interval '1 hour') >= 150
     or (p_ip is not null and (select count(*) from public.story_upload_tickets
                                where ip = p_ip and created_at > now() - interval '1 hour') >= 12) then
    raise exception 'too many photo uploads, try again later' using errcode = '54000';
  end if;
  insert into public.story_upload_tickets (path, ip) values (p_path, left(p_ip, 100));
end;
$$;

-- Uploads older than a day that no story uses: the server deletes the files, then the tickets.
create or replace function public.stale_story_uploads(p_limit int)
returns setof text language sql stable security definer set search_path = '' as $$
  select t.path
    from public.story_upload_tickets t
   where t.created_at < now() - interval '1 day'
     and not exists (select 1 from public.support_requests r where t.path = any (r.media_paths))
   order by t.created_at
   limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

-- ── 4. The Inbox shows visitors too ─────────────────────────────────────────
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
  select r.id, r.user_id, coalesce(u.email::text, r.contact_email), coalesce(p.full_name, r.contact_name), r.kind, r.subject,
         r.body, r.page_url, r.consent_public, r.status, r.answer, r.answered_at, a.email::text, r.created_at, r.media_paths,
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
revoke all on function public.admin_list_support_requests(text, text, int, int) from public, anon, authenticated;
grant execute on function public.admin_list_support_requests(text, text, int, int) to service_role;

-- ── 5. Saving a visitor's story ─────────────────────────────────────────────
-- Called by the server after Turnstile. Every photo must be one this upload session started; one
-- email sends at most 3 stories a day, one internet address 5, and all visitors together 100.
drop function if exists public.submit_visitor_story(text, text, text, text, boolean, uuid, text[]);
create or replace function public.submit_visitor_story(
  p_name text, p_email text, p_subject text, p_body text, p_consent_public boolean, p_session uuid, p_media_paths text[], p_ip text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_paths text[] := coalesce(p_media_paths, '{}');
  v_id uuid;
begin
  -- Simultaneous submissions count one after another.
  perform pg_advisory_xact_lock(hashtext('submit_visitor_story'));
  if p_ip is not null and (select count(*) from public.support_requests
                            where contact_ip = left(p_ip, 100) and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too many stories from this address today' using errcode = '54000';
  end if;
  if (select count(*) from public.support_requests
       where contact_email = lower(btrim(p_email)) and created_at > now() - interval '1 day') >= 3 then
    raise exception 'too many stories from this address today' using errcode = '54000';
  end if;
  if (select count(*) from public.support_requests
       where contact_email is not null and created_at > now() - interval '1 day') >= 100 then
    raise exception 'too many visitor stories today' using errcode = '54000';
  end if;
  if exists (select 1 from unnest(v_paths) x
              where x is null
                 or x not like 'guest/' || p_session::text || '/stories/%'
                 or not exists (select 1 from public.story_upload_tickets t where t.path = x)) then
    raise exception 'photos must be uploads from this form' using errcode = '42501';
  end if;
  insert into public.support_requests (user_id, kind, subject, body, page_url, consent_public, media_paths, contact_name, contact_email, contact_ip)
  values (null, 'story', nullif(btrim(p_subject), ''), btrim(p_body), '/stories/share', coalesce(p_consent_public, false), v_paths,
          btrim(p_name), lower(btrim(p_email)), left(p_ip, 100))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_visitor_story(text, text, text, text, boolean, uuid, text[], text) from public, anon, authenticated;
grant execute on function public.submit_visitor_story(text, text, text, text, boolean, uuid, text[], text) to service_role;
revoke all on function public.issue_story_upload_ticket(text, text) from public, anon, authenticated;
grant execute on function public.issue_story_upload_ticket(text, text) to service_role;
revoke all on function public.stale_story_uploads(int) from public, anon, authenticated;
grant execute on function public.stale_story_uploads(int) to service_role;
