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
