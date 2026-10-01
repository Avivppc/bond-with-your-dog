-- ============================================================
-- Scheduled reminders (the daily /api/cron/reminders job)
--   1. profiles.timezone: the member's IANA time zone (captured from the browser, editable in Settings)
--   2. reminder_deliveries: one row per reminder sent, so a job that runs twice never sends twice
--   3. Service-role helpers the job reads and writes through:
--        reminder_members        active members with what the job needs (zone, days, prefs, recent practice)
--        reminder_lesson_unlocks drip lessons that opened for a member in a time window
--        deliver_reminder        claims a delivery and, when new, writes the in-app notification
-- Nothing here is reachable by members: the table has no policies and the functions are
-- granted to service_role only.
-- Tests: supabase/tests/reminders.test.sql
-- ============================================================

-- ── 1. Member time zone ─────────────────────────────────────
alter table public.profiles add column if not exists timezone text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_timezone_check') then
    -- Loose shape check ("Asia/Jerusalem", "America/Argentina/Buenos_Aires", "UTC", "Etc/GMT+3").
    -- Unknown-but-well-formed names are tolerated; the job falls back to UTC for them.
    alter table public.profiles add constraint profiles_timezone_check check (
      timezone is null
      or (char_length(timezone) between 1 and 64 and timezone ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+){0,2}$')
    );
  end if;
end $$;

-- ── 2. Delivery log ─────────────────────────────────────────
create table if not exists public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  -- null = the team inbox (COACH_INBOX) rather than a member
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'practice', 'lesson_unlocked', 'qa_day_before', 'qa_day_of', 'feedback_overdue', 'feedback_overdue_email'
  )),
  -- what the reminder is about: a local date for practice, otherwise a lesson / meetup / video id
  ref text not null check (char_length(ref) between 1 and 100),
  sent_at timestamptz not null default now(),
  constraint reminder_deliveries_once unique nulls not distinct (user_id, kind, ref)
);
create index if not exists reminder_deliveries_sent on public.reminder_deliveries (sent_at desc);
alter table public.reminder_deliveries enable row level security;
revoke all on public.reminder_deliveries from anon, authenticated;

-- ── 3a. Claim + notify, atomically ──────────────────────────
-- Returns true only for the first call with this (user, kind, ref); that call also writes the
-- in-app notification (when a title is given). Later calls change nothing and return false.
create or replace function public.deliver_reminder(
  p_user uuid,
  p_kind text,
  p_ref text,
  p_notice_kind text,
  p_title text,
  p_body text,
  p_href text
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.reminder_deliveries (user_id, kind, ref)
  values (p_user, p_kind, p_ref)
  on conflict on constraint reminder_deliveries_once do nothing
  returning id into v_id;
  if v_id is null then return false; end if;
  if p_user is not null and p_title is not null then
    perform private.notify(p_user, p_notice_kind, p_title, p_body, p_href);
  end if;
  return true;
end;
$$;

-- ── 3b. Who the job can remind ──────────────────────────────
-- Members with an active course or community grant, in id order (keyset pages of up to 1000).
-- practiced_on holds their practice dates around today, enough to tell "practiced today" in any zone.
create or replace function public.reminder_members(p_after uuid default null, p_limit int default 500)
returns table (
  user_id uuid,
  email text,
  first_name text,
  timezone text,
  practice_days smallint[],
  session_minutes int,
  notif_prefs jsonb,
  has_courses boolean,
  in_community boolean,
  practiced_on date[]
)
language sql stable security definer set search_path = public as $$
  with page as (
    select u.id, u.email,
           exists (select 1 from public.enrollments e
                    where e.user_id = u.id and (e.expires_at is null or e.expires_at > now())) as has_courses,
           exists (select 1 from public.community_grants g
                    where g.user_id = u.id and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())) as has_grant
      from auth.users u
     where (p_after is null or u.id > p_after)
       and (exists (select 1 from public.enrollments e
                     where e.user_id = u.id and (e.expires_at is null or e.expires_at > now()))
            or exists (select 1 from public.community_grants g
                        where g.user_id = u.id and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())))
     order by u.id
     limit least(greatest(coalesce(p_limit, 500), 1), 1000)
  )
  select pg.id,
         pg.email,
         nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), ''),
         p.timezone,
         coalesce(p.practice_days, '{}'::smallint[]),
         coalesce(p.session_minutes, 10),
         coalesce(p.notif_prefs, '{}'::jsonb),
         pg.has_courses,
         pg.has_grant or (pg.has_courses and coalesce((select open_to_students from public.community_settings where id = 1), false)),
         coalesce(array(select distinct s.practiced_on from public.practice_sessions s
                         where s.user_id = pg.id and s.practiced_on between current_date - 2 and current_date + 2
                         order by s.practiced_on), '{}'::date[])
    from page pg
    left join public.profiles p on p.id = pg.id
   order by pg.id;
$$;

-- ── 3c. Drip lessons that opened in a window ────────────────
-- True when every live lesson of the course is complete for the user ("Opens after Foundations").
create or replace function private.course_completed(p_user uuid, p_course text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.lessons l
     where l.course_id = p_course
       and l.published
       and (l.module_id is null or public.is_module_live(l.module_id))
       and not exists (select 1 from public.lesson_progress lp
                        where lp.lesson_id = l.id and lp.user_id = p_user and lp.completed_at is not null)
  );
$$;

-- Only lessons with a real delay (available_after_days > 0) that the member can actually open now:
-- live content, an active enrollment, not behind a paywall they haven't bought past, chapter unlocked.
create or replace function public.reminder_lesson_unlocks(p_since timestamptz, p_until timestamptz)
returns table (user_id uuid, lesson_id uuid, lesson_title text, course_id text, course_title text, unlocks_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.user_id, l.id, l.title, c.id, c.title, e.enrolled_at + make_interval(days => l.available_after_days)
    from public.enrollments e
    join public.courses c on c.id = e.course_id
    join public.lessons l on l.course_id = e.course_id
   where l.available_after_days > 0
     and l.published
     and c.published
     and (l.module_id is null or public.is_module_live(l.module_id))
     and (e.expires_at is null or e.expires_at > now())
     and e.enrolled_at + make_interval(days => l.available_after_days) > p_since
     and e.enrolled_at + make_interval(days => l.available_after_days) <= least(p_until, now())
     and (e.access_level = 'full' or not private.lesson_behind_paywall(l.id))
     and (c.requires_course_id is null or private.course_completed(e.user_id, c.requires_course_id))
   order by 6, 1
   limit 5000;
$$;

-- ── Grants: service role only ───────────────────────────────
revoke all on function public.deliver_reminder(uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.reminder_members(uuid, int) from public, anon, authenticated;
revoke all on function public.reminder_lesson_unlocks(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function private.course_completed(uuid, text) from public, anon, authenticated;
grant execute on function public.deliver_reminder(uuid, text, text, text, text, text, text) to service_role;
grant execute on function public.reminder_members(uuid, int) to service_role;
grant execute on function public.reminder_lesson_unlocks(timestamptz, timestamptz) to service_role;
