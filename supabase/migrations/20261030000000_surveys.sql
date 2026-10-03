-- Assessments: surveys (questions without a right answer, answers saved to the member) and the
-- numbers for the chapter checkpoint quizzes that already exist (lessons of kind 'quiz').

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  intro text not null default '' check (char_length(intro) <= 1000),
  thank_you text not null default '' check (char_length(thank_you) <= 500),
  -- [{id, type: single|multi|short|long|rating, prompt, required, options[]}], checked by the app.
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  -- Offered at the end of this chapter (null = only by link).
  course_id text references public.courses(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists surveys_course on public.surveys (course_id) where status = 'published';
alter table public.surveys enable row level security;

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now(),
  -- One answer per member; answering again replaces it.
  unique (survey_id, user_id)
);
create index if not exists survey_responses_user on public.survey_responses (user_id, created_at desc);
alter table public.survey_responses enable row level security;

-- Checkpoint quizzes: attempts, who tried, who passed, average score, per quiz lesson.
create or replace function public.admin_quiz_stats()
returns table (lesson_id uuid, course_id text, course_title text, lesson_title text, pass_threshold int,
               attempts bigint, members bigint, passed_members bigint, average_score numeric)
language sql stable security definer set search_path = '' as $$
  select l.id, c.id, c.title, l.title, coalesce(l.pass_threshold, 70),
         count(a.id),
         count(distinct a.user_id),
         count(distinct a.user_id) filter (where a.passed),
         round(avg(a.score)::numeric, 0)
  from public.lessons l
  join public.courses c on c.id = l.course_id
  left join public.quiz_attempts a on a.lesson_id = l.id
  where l.kind = 'quiz'
  group by l.id, c.id, c.title, l.title, l.pass_threshold, c.chapter_number, l.position
  order by c.chapter_number nulls last, c.title, l.position;
$$;
revoke execute on function public.admin_quiz_stats() from public, anon, authenticated;
grant execute on function public.admin_quiz_stats() to service_role;
