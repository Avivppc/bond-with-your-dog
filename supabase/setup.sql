-- ============================================================
-- Keta Tov LMS schema
-- Apply via Supabase SQL editor (or `supabase db push`)
-- ============================================================

-- Profiles -----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  dog_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_upsert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Courses ------------------------------------------------------
create table if not exists public.courses (
  id text primary key,
  title text not null,
  description text not null,
  level text not null check (level in ('Beginner','Intermediate','Advanced')),
  category text not null,
  price numeric(10,2) not null default 0,
  badge text,
  image text,
  image_alt text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "courses_public_read"
  on public.courses for select
  using (published = true);

-- Lessons ------------------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  position int not null,
  title text not null,
  description text,
  duration_seconds int,
  mux_playback_id text,
  mux_playback_policy text not null default 'signed' check (mux_playback_policy in ('public','signed')),
  free_preview boolean not null default false,
  created_at timestamptz not null default now(),
  unique (course_id, position)
);

alter table public.lessons enable row level security;

-- Anyone can see lesson metadata (titles, order). Only enrolled users get playback IDs (enforced in app code via signed URL endpoint).
create policy "lessons_public_read_meta"
  on public.lessons for select
  using (true);

-- Enrollments --------------------------------------------------
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.enrollments enable row level security;

create policy "enrollments_select_own"
  on public.enrollments for select
  using (auth.uid() = user_id);

create policy "enrollments_insert_own"
  on public.enrollments for insert
  with check (auth.uid() = user_id);

create policy "enrollments_delete_own"
  on public.enrollments for delete
  using (auth.uid() = user_id);

-- Progress -----------------------------------------------------
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz,
  watch_seconds int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

create policy "progress_select_own"
  on public.lesson_progress for select
  using (auth.uid() = user_id);

create policy "progress_upsert_own"
  on public.lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "progress_update_own"
  on public.lesson_progress for update
  using (auth.uid() = user_id);

-- Helper view: is the current user enrolled in a course?
create or replace view public.my_enrollments as
  select course_id from public.enrollments where user_id = auth.uid();

-- ============================================================
-- Seed data (optional — keeps app/lib/data.ts in sync as DB rows)
-- ============================================================
insert into public.courses (id, title, description, level, category, price, badge, image, image_alt) values
  ('kinetic-basics', 'The Kinetic Basics: First Steps to Rhythm', 'Learn the fundamental movements that form the backbone of every dog dance routine, including focus and basic positioning.', 'Beginner', 'Foundations', 49, 'Included in Pro', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwXwgEQpqaf2YHDfk-I8RjVyi7frfIlbW8XCuPyuPAP_1U7lbaiDiX2KVyuYKjjlhzwU5z3A58ZLITFTDvf9Maae5Rsa7QcxLKkNSqDeq9ZCFg9LCztDB_CQi-Fb95taoRdQyxbh5erABtnIh8WxsJ_7lbW6YC9wRFdEurVSOqCuwvM3sd6yaknN-6uLYlO3eWNmjOnUyVXiEk2AEfkPs2UR2QcwVyl6sIibeAVWuby--9bPjH20K9_7wQd6NeBHIzqlUB6mKEq8Hj', 'A joyful border collie performing a leg weave'),
  ('advanced-spins', 'Advanced Spins & Vertical Transitions', 'Elevate your performance with dynamic spins, jumps, and vertical elements that add flair to any routine.', 'Intermediate', 'Trick Training', 65, 'Included in Pro', '', ''),
  ('musical-mastery', 'Musical Mastery: Syncing with the Beat', 'A masterclass in musicality. Learn to analyze music and build a narrative routine.', 'Advanced', 'Choreography', 89, 'Mastery Series', '', ''),
  ('perfect-heelwork', 'Perfect Heelwork: The Foundation of Flow', 'Achieve a perfect glue heel that stays consistent through turns and speed changes.', 'Beginner', 'Foundations', 35, 'Pro Only', '', ''),
  ('puppy-prodigy', 'Puppy Prodigy: Early Rhythmic Play', 'Fun games and focus exercises designed specifically for developing puppy minds and bodies.', 'Beginner', 'Foundations', 29, 'Best Value', '', ''),
  ('prop-work', 'Prop Work & Hoops: Stage Mechanics', 'Incorporate props seamlessly into your dance.', 'Intermediate', 'Trick Training', 55, 'Popular', '', '')
on conflict (id) do nothing;
-- ============================================================
-- Phase 1: drip content, quizzes, certificates
-- Apply via Supabase SQL editor AFTER schema.sql
-- ============================================================

-- ── Drip + lesson kinds ─────────────────────────────────────
alter table public.lessons add column if not exists kind text not null default 'video' check (kind in ('video','quiz'));
alter table public.lessons add column if not exists available_after_days int;  -- null = unlocked immediately
alter table public.lessons add column if not exists pass_threshold int not null default 70;

-- ── Quiz questions ──────────────────────────────────────────
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  position int not null,
  prompt text not null,
  -- 'single' = one correct option; 'multi' = multiple correct; 'tf' = true/false
  kind text not null default 'single' check (kind in ('single','multi','tf')),
  options jsonb not null default '[]'::jsonb,        -- [{id,text}] for single/multi; ignored for tf
  correct jsonb not null,                            -- ['opt1'] or ['opt1','opt3'] or [true]
  explanation text,
  created_at timestamptz not null default now(),
  unique (lesson_id, position)
);

alter table public.quiz_questions enable row level security;

-- Enrolled users can see questions; correct answers stripped at the route layer
create policy "quiz_questions_read_enrolled"
  on public.quiz_questions for select
  using (
    exists (
      select 1
      from public.lessons l
      join public.enrollments e on e.course_id = l.course_id
      where l.id = quiz_questions.lesson_id and e.user_id = auth.uid()
    )
  );

-- ── Quiz attempts ───────────────────────────────────────────
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  score int not null,
  passed boolean not null,
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;

create policy "quiz_attempts_select_own"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

create policy "quiz_attempts_insert_own"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);

-- ── Certificates ────────────────────────────────────────────
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  student_name text not null,
  course_title text not null,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.certificates enable row level security;

create policy "certificates_select_own"
  on public.certificates for select
  using (auth.uid() = user_id);

-- Public verification by code (anyone with the code can verify)
create policy "certificates_verify_by_code"
  on public.certificates for select
  using (true);

-- Drop the more permissive then re-add the own policy specifically
-- (Postgres OR's permissive policies; verify-by-code already covers select)

-- ── Admin write policies ────────────────────────────────────
-- Admins are gated in app code (env ADMIN_EMAILS); to allow their writes,
-- we add a helper that checks the JWT email claim.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'email') = any (
      string_to_array(coalesce(current_setting('app.admin_emails', true), ''), ',')
    ),
    false
  );
$$;

-- NOTE: instead of relying on a Postgres GUC, we'll do all admin writes
-- via a service-role Supabase client on the server (bypasses RLS).
-- The function above is kept as a fallback if you prefer JWT-based checks.

-- Allow admins to read all enrollments/progress for ops (optional, scoped to service role)
-- (no policy needed — service role bypasses RLS)

-- ── Helper: lesson unlock time ──────────────────────────────
create or replace function public.lesson_unlocks_at(p_lesson_id uuid, p_user_id uuid)
returns timestamptz
language sql
stable
as $$
  select case
    when l.available_after_days is null then e.enrolled_at
    else e.enrolled_at + (l.available_after_days || ' days')::interval
  end
  from public.lessons l
  join public.enrollments e
    on e.course_id = l.course_id and e.user_id = p_user_id
  where l.id = p_lesson_id;
$$;
-- ============================================================
-- Profile fields + achievements + auto-award on lesson completion
-- Apply via Supabase SQL editor AFTER 001_phase1.sql
-- ============================================================

-- Extra profile fields
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists dog_breed text;
alter table public.profiles add column if not exists dog_age int;
alter table public.profiles add column if not exists tagline text;          -- the editorial headline on /profile
alter table public.profiles add column if not exists notif_prefs jsonb not null default '{"new_courses":true,"live_sessions":true,"community":false}'::jsonb;

-- Achievement catalog (static-ish, but lives in DB so admins can add)
create table if not exists public.achievement_defs (
  code text primary key,
  title text not null,
  description text not null,
  icon text not null,                -- material symbol name
  -- 'first_lesson','course_complete','streak_7','first_upload', etc.
  rule text not null
);

insert into public.achievement_defs (code, title, description, icon, rule) values
  ('first_lesson',   'First Dance',    'Completed your first lesson.',           'star',             'first_lesson'),
  ('course_complete','Course Champion','Completed an entire course.',            'workspace_premium','course_complete'),
  ('three_lessons',  'Warming Up',     'Completed 3 lessons.',                   'local_fire_department', 'lessons_count_3'),
  ('ten_lessons',    'On the Beat',    'Completed 10 lessons.',                  'music_note',       'lessons_count_10')
on conflict (code) do nothing;

-- User-earned achievements
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null references public.achievement_defs(code) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, code)
);

alter table public.achievements enable row level security;

create policy "achievements_select_own"
  on public.achievements for select using (auth.uid() = user_id);

create policy "achievements_select_public_for_spotlight"
  on public.achievements for select using (true);   -- counts visible publicly

-- Trigger: award achievements on lesson_progress completion
create or replace function public.award_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_course_id text;
  v_total_in_course int;
  v_done_in_course int;
begin
  -- only fire when newly completed
  if new.completed_at is null then return new; end if;
  if (tg_op = 'UPDATE' and old.completed_at is not null) then return new; end if;

  -- first_lesson
  insert into public.achievements (user_id, code) values (new.user_id, 'first_lesson')
    on conflict do nothing;

  -- count completed lessons
  select count(*) into v_count
    from public.lesson_progress
   where user_id = new.user_id and completed_at is not null;

  if v_count >= 3 then
    insert into public.achievements (user_id, code) values (new.user_id, 'three_lessons')
      on conflict do nothing;
  end if;
  if v_count >= 10 then
    insert into public.achievements (user_id, code) values (new.user_id, 'ten_lessons')
      on conflict do nothing;
  end if;

  -- course_complete: did this push the user to 100% on the course?
  select l.course_id into v_course_id from public.lessons l where l.id = new.lesson_id;
  select count(*) into v_total_in_course from public.lessons where course_id = v_course_id;
  select count(*) into v_done_in_course
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
   where lp.user_id = new.user_id and lp.completed_at is not null and l.course_id = v_course_id;

  if v_total_in_course > 0 and v_done_in_course >= v_total_in_course then
    insert into public.achievements (user_id, code) values (new.user_id, 'course_complete')
      on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_award_achievements on public.lesson_progress;
create trigger trg_award_achievements
  after insert or update on public.lesson_progress
  for each row execute function public.award_achievements();
-- ============================================================
-- Certificates auto-issue + student video uploads
-- Apply via Supabase SQL editor AFTER 002_profile_achievements.sql
-- ============================================================

-- ── Certificate auto-issue trigger ──────────────────────────
-- Fires after lesson_progress completion: if user has now finished
-- all lessons in a course, insert a certificate (idempotent).
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
  v_code text;
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
  v_code := encode(gen_random_bytes(8), 'hex');

  insert into public.certificates (code, user_id, course_id, student_name, course_title)
  values (v_code, new.user_id, v_course_id, coalesce(nullif(v_full_name, ''), 'Member'), v_course_title)
  on conflict (user_id, course_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_issue_certificate on public.lesson_progress;
create trigger trg_issue_certificate
  after insert or update on public.lesson_progress
  for each row execute function public.maybe_issue_certificate();

-- ── Student video uploads ───────────────────────────────────
create table if not exists public.student_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- optional ties to a course or lesson
  course_id text references public.courses(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  description text,
  -- mux fields
  mux_upload_id text,
  mux_asset_id text,
  mux_playback_id text,
  status text not null default 'preparing' check (status in ('preparing','ready','errored')),
  -- visibility
  is_public boolean not null default false,
  consent_public boolean not null default false,
  -- moderation (admins approve before public listing)
  approved boolean not null default false,
  duration_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_videos_user on public.student_videos(user_id);
create index if not exists idx_student_videos_public on public.student_videos(is_public, approved, status) where is_public = true;

alter table public.student_videos enable row level security;

create policy "videos_select_own" on public.student_videos
  for select using (auth.uid() = user_id);

create policy "videos_select_public" on public.student_videos
  for select using (is_public = true and approved = true and status = 'ready');

create policy "videos_insert_own" on public.student_videos
  for insert with check (auth.uid() = user_id);

create policy "videos_update_own" on public.student_videos
  for update using (auth.uid() = user_id);

create policy "videos_delete_own" on public.student_videos
  for delete using (auth.uid() = user_id);
