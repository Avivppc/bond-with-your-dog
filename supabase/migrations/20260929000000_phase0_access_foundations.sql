-- ============================================================
-- Phase 0: access rules live in the database
--
-- Web and (future) mobile clients share these rules, so anything that
-- grants value — enrollment, lesson completion, quiz pass, certificate —
-- goes through SECURITY DEFINER functions that check entitlement.
-- Clients keep read access to their own rows via RLS; direct writes are removed.
-- Tests: supabase/tests/phase0_access.test.sql (npm run test:db)
-- ============================================================

-- Internal helpers live outside `public` so PostgREST does not expose them as RPC.
create schema if not exists private;
revoke all on schema private from public;

-- ── Events (append-only business log; consumed by emails/automations/analytics) ──
create table if not exists public.events (
  id bigint generated always as identity primary key,
  type text not null,                       -- e.g. 'enrollment.created', 'lesson.completed'
  user_id uuid references auth.users(id) on delete set null,
  subject_type text,                        -- 'course' | 'lesson' | ...
  subject_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_type_created on public.events(type, created_at);
create index if not exists idx_events_user on public.events(user_id);
alter table public.events enable row level security;
-- No policies on purpose: only the service role and definer functions touch events.

create or replace function private.emit_event(
  p_type text, p_user_id uuid, p_subject_type text, p_subject_id text, p_payload jsonb default '{}'::jsonb
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.events (type, user_id, subject_type, subject_id, payload)
  values (p_type, p_user_id, p_subject_type, p_subject_id, coalesce(p_payload, '{}'::jsonb));
$$;
revoke all on function private.emit_event(text, uuid, text, text, jsonb) from public, anon, authenticated;

-- ── Enrollments: record where access came from ──
-- Existing rows predate paid access, so they are labelled 'legacy' rather than guessed.
alter table public.enrollments add column if not exists source text;
update public.enrollments set source = 'legacy' where source is null;
alter table public.enrollments alter column source set default 'free';
alter table public.enrollments alter column source set not null;
alter table public.enrollments drop constraint if exists enrollments_source_check;
alter table public.enrollments add constraint enrollments_source_check
  check (source in ('free', 'grant', 'order', 'subscription', 'legacy'));
alter table public.enrollments add column if not exists expires_at timestamptz;  -- null = lifetime

-- ── Remove client write paths (RLS policies AND table privileges) ──
drop policy if exists "enrollments_insert_own" on public.enrollments;
drop policy if exists "enrollments_delete_own" on public.enrollments;
drop policy if exists "progress_upsert_own" on public.lesson_progress;
drop policy if exists "progress_update_own" on public.lesson_progress;
drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;

-- Defence in depth: even a stray policy cannot re-open writes without these privileges.
revoke insert, update, delete, truncate on
  public.enrollments, public.lesson_progress, public.quiz_attempts,
  public.certificates, public.achievements, public.events, public.quiz_questions
  from anon, authenticated;

-- ── Certificates & achievements: own rows only ──
drop policy if exists "certificates_verify_by_code" on public.certificates;
drop policy if exists "achievements_select_public_for_spotlight" on public.achievements;

-- ── can_access_lesson: the single access rule for web, app and API ──
-- Accessible when the lesson is a free preview, or the caller has an unexpired
-- enrollment in the course and the lesson's drip delay has passed.
create or replace function public.can_access_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lessons l
    where l.id = p_lesson_id
      and (
        l.free_preview
        or exists (
          select 1
          from public.enrollments e
          where e.course_id = l.course_id
            and e.user_id = auth.uid()
            and (e.expires_at is null or e.expires_at > now())
            and now() >= e.enrolled_at + make_interval(days => coalesce(l.available_after_days, 0))
        )
      )
  );
$$;

-- ── Quiz questions: prompts follow the lesson access rule; answers stay server-side ──
drop policy if exists "quiz_questions_read_enrolled" on public.quiz_questions;
drop policy if exists "quiz_questions_read_accessible" on public.quiz_questions;
create policy "quiz_questions_read_accessible"
  on public.quiz_questions for select
  using (public.can_access_lesson(lesson_id));

-- Column-level privilege: `correct` and `explanation` are only read by the grader (service role).
revoke select on public.quiz_questions from anon, authenticated;
grant select (id, lesson_id, position, prompt, kind, options, created_at)
  on public.quiz_questions to authenticated;

-- ── enroll_free: self-enrollment is allowed only for published courses priced 0 ──
create or replace function public.enroll_free(p_course_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inserted int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.courses where id = p_course_id and published and price = 0
  ) then
    raise exception 'course % is not open for free enrollment', p_course_id using errcode = '42501';
  end if;

  insert into public.enrollments (user_id, course_id, source)
  values (v_uid, p_course_id, 'free')
  on conflict (user_id, course_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    perform private.emit_event('enrollment.created', v_uid, 'course', p_course_id,
                               jsonb_build_object('source', 'free'));
  end if;
end;
$$;

-- ── record_lesson_progress: watch time only; never clears a completion ──
create or replace function public.record_lesson_progress(p_lesson_id uuid, p_watch_seconds int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.can_access_lesson(p_lesson_id) then
    raise exception 'no access to lesson %', p_lesson_id using errcode = '42501';
  end if;

  insert into public.lesson_progress (user_id, lesson_id, watch_seconds, updated_at)
  values (v_uid, p_lesson_id, greatest(coalesce(p_watch_seconds, 0), 0), now())
  on conflict (user_id, lesson_id) do update
    set watch_seconds = greatest(public.lesson_progress.watch_seconds, excluded.watch_seconds),
        updated_at = now();
end;
$$;

-- ── complete_lesson: requires access; quiz lessons also need a passed attempt ──
-- Completion fires the existing achievement + certificate triggers.
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

  select completed_at is not null into v_already_completed
  from public.lesson_progress where user_id = v_uid and lesson_id = p_lesson_id;

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

-- ── Certificate trigger: portable code generation ──
-- The original used gen_random_bytes() (pgcrypto), which Supabase installs in the
-- `extensions` schema — not visible under `set search_path = public`, so finishing
-- a course would fail. gen_random_uuid() is built into Postgres 13+.
create or replace function public.maybe_issue_certificate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id text;
  v_total int;
  v_done int;
  v_full_name text;
  v_course_title text;
begin
  if new.completed_at is null then return new; end if;
  if (tg_op = 'UPDATE' and old.completed_at is not null) then return new; end if;

  select course_id into v_course_id from public.lessons where id = new.lesson_id;
  if v_course_id is null then return new; end if;

  select count(*) into v_total from public.lessons where course_id = v_course_id;
  select count(*) into v_done
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
   where lp.user_id = new.user_id and lp.completed_at is not null and l.course_id = v_course_id;

  if v_total = 0 or v_done < v_total then return new; end if;

  select coalesce(full_name, '') into v_full_name from public.profiles where id = new.user_id;
  select title into v_course_title from public.courses where id = v_course_id;

  insert into public.certificates (code, user_id, course_id, student_name, course_title)
  values (substr(replace(gen_random_uuid()::text, '-', ''), 1, 16), new.user_id, v_course_id,
          coalesce(nullif(v_full_name, ''), 'Member'), v_course_title)
  on conflict (user_id, course_id) do nothing;

  return new;
end;
$$;

-- ── verify_certificate: public lookup by code, exposing only printable fields ──
create or replace function public.verify_certificate(p_code text)
returns table (code text, student_name text, course_title text, issued_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.code, c.student_name, c.course_title, c.issued_at
  from public.certificates c
  where c.code = p_code;
$$;

-- ── Student videos: moderation flag is admin-only ──
-- Owners may insert/edit their videos, but `approved` is forced by this trigger
-- unless the write comes from the service role (admin moderation).
create or replace function private.guard_student_video_approval()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.approved := case when tg_op = 'INSERT' then false else old.approved end;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_student_video_approval on public.student_videos;
create trigger trg_guard_student_video_approval
  before insert or update on public.student_videos
  for each row execute function private.guard_student_video_approval();

-- ── Execute grants ──
-- Supabase grants EXECUTE on new public functions to anon/authenticated directly,
-- so revoke from every API role before granting the intended audience.
revoke all on function public.can_access_lesson(uuid) from public, anon, authenticated;
revoke all on function public.enroll_free(text) from public, anon, authenticated;
revoke all on function public.record_lesson_progress(uuid, int) from public, anon, authenticated;
revoke all on function public.complete_lesson(uuid) from public, anon, authenticated;
revoke all on function public.verify_certificate(text) from public, anon, authenticated;
revoke all on function public.maybe_issue_certificate() from public, anon, authenticated;

grant execute on function public.can_access_lesson(uuid) to anon, authenticated, service_role;
grant execute on function public.enroll_free(text) to authenticated;
grant execute on function public.record_lesson_progress(uuid, int) to authenticated;
grant execute on function public.complete_lesson(uuid) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated, service_role;

-- ── Safety net: fail loudly if any client write policy survives under another name ──
do $$
declare
  v_leftover text;
begin
  select string_agg(format('%I on %I (%s)', policyname, tablename, cmd), ', ')
    into v_leftover
    from pg_policies
   where schemaname = 'public'
     and tablename in ('enrollments', 'lesson_progress', 'quiz_attempts', 'certificates', 'achievements', 'events')
     and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');
  if v_leftover is not null then
    raise exception 'phase0: unexpected client write policies remain: %', v_leftover;
  end if;
end $$;
