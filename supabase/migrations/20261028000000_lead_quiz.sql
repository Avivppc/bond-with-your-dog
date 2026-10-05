-- Lead quiz content (/quiz): questions and the three results, edited in Admin → Assessments → Lead quiz.
-- One row at most. No row means "use the original quiz in code" (src/lib/quiz/data.ts), so
-- "Reset to the original quiz" just deletes it. The app validates the JSON shape (src/lib/quiz/config.ts)
-- and falls back to the original quiz when it doesn't fit.
create table if not exists public.lead_quiz_config (
  id int primary key default 1 check (id = 1),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  results jsonb not null check (jsonb_typeof(results) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Read and written only on the server with the service role: no policies, no API grants.
alter table public.lead_quiz_config enable row level security;
revoke all on public.lead_quiz_config from anon, authenticated;
