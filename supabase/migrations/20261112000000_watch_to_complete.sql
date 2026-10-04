-- A video lesson is complete only after the member watched most of it.
--   1. lesson_progress.played_seconds  seconds of the video actually played (seeking doesn't count);
--                                      watch_seconds stays "the furthest point", for resuming
--   2. record_lesson_progress          adds what the player reports; the total can't outgrow the real
--                                      time since watching began (twice it, for fast playback), so it
--                                      can't be sent all at once or in many quick calls
--   3. complete_lesson                 refuses a video lesson until 80% of its length was played
-- Lessons without a video, or whose video length isn't known, complete as before. Completions that
-- already happened stay.

-- ── 1. Played time ──────────────────────────────────────────────────────────
alter table public.lesson_progress add column if not exists played_seconds int not null default 0;
-- When the first played seconds were recorded: the total is capped by the time since.
alter table public.lesson_progress add column if not exists played_since timestamptz;

-- ── 2. Recording it ─────────────────────────────────────────────────────────
drop function if exists public.record_lesson_progress(uuid, int);
create or replace function public.record_lesson_progress(p_lesson_id uuid, p_watch_seconds int, p_played_seconds int default 0)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_since timestamptz;
  v_before int;
  v_cap int;
  v_total int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.can_access_lesson(p_lesson_id) then
    raise exception 'no access to lesson %', p_lesson_id using errcode = '42501';
  end if;

  -- The running total may reach twice the time since watching began (fast playback) plus 30 s of
  -- slack, however the reports are split. Rows from before this rule start their clock now.
  select played_since, played_seconds into v_since, v_before
    from public.lesson_progress where user_id = v_uid and lesson_id = p_lesson_id;
  v_since := coalesce(v_since, now());
  v_before := coalesce(v_before, 0);
  v_cap := least(ceil(extract(epoch from now() - v_since) * 2)::int + 30, 1000000);
  v_total := greatest(v_before, least(v_before + greatest(coalesce(p_played_seconds, 0), 0), v_cap));

  insert into public.lesson_progress (user_id, lesson_id, watch_seconds, played_seconds, played_since, updated_at)
  values (v_uid, p_lesson_id, greatest(coalesce(p_watch_seconds, 0), 0), v_total, v_since, now())
  on conflict (user_id, lesson_id) do update
    set watch_seconds = greatest(public.lesson_progress.watch_seconds, excluded.watch_seconds),
        played_seconds = excluded.played_seconds,
        played_since = excluded.played_since,
        updated_at = now();
end;
$$;

-- ── 3. Completing ───────────────────────────────────────────────────────────
-- Same as before (access, quiz needs a pass, one event), plus the watch rule. 80% of the length:
-- the player finishes a lesson at 90% of the timeline, and resuming replays a few seconds.
create or replace function public.complete_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
  v_course_id text;
  v_already_completed boolean;
  v_duration int;
  v_played int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.can_access_lesson(p_lesson_id) then
    raise exception 'no access to lesson %', p_lesson_id using errcode = '42501';
  end if;

  select kind, course_id into v_kind, v_course_id from public.lessons where id = p_lesson_id;

  if v_kind = 'quiz' and not exists (
    select 1 from public.quiz_attempts
    where user_id = v_uid and lesson_id = p_lesson_id and passed
  ) then
    raise exception 'quiz lesson % has no passing attempt', p_lesson_id using errcode = '42501';
  end if;

  select completed_at is not null, played_seconds into v_already_completed, v_played
  from public.lesson_progress where user_id = v_uid and lesson_id = p_lesson_id;

  if not coalesce(v_already_completed, false) then
    select duration_seconds into v_duration from public.lesson_videos where lesson_id = p_lesson_id;
    if coalesce(v_duration, 0) > 0 and coalesce(v_played, 0) < floor(v_duration * 0.8) then
      raise exception 'watch the lesson video first' using errcode = 'P0001', hint = 'watch_required';
    end if;
  end if;

  insert into public.lesson_progress (user_id, lesson_id, completed_at, updated_at)
  values (v_uid, p_lesson_id, now(), now())
  on conflict (user_id, lesson_id) do update
    set completed_at = coalesce(public.lesson_progress.completed_at, now()),
        updated_at = now();

  if not coalesce(v_already_completed, false) then
    perform private.emit_event('lesson.completed', v_uid, 'lesson', p_lesson_id::text,
                               jsonb_build_object('course_id', v_course_id));
  end if;
end;
$$;

revoke all on function public.record_lesson_progress(uuid, int, int) from public, anon, authenticated;
grant execute on function public.record_lesson_progress(uuid, int, int) to authenticated;
revoke all on function public.complete_lesson(uuid) from public, anon, authenticated;
grant execute on function public.complete_lesson(uuid) to authenticated;
