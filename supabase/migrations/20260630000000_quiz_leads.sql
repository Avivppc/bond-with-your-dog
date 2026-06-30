-- ============================================================
-- "Find Your Journey" quiz lead capture
-- Apply via Supabase SQL editor AFTER 20260507000003_uploads_certs.sql
-- ============================================================

create table if not exists public.quiz_leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  email text not null,
  tier text not null check (tier in ('foundations', 'movement', 'masterpiece')),
  scores jsonb not null,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_leads_email on public.quiz_leads(email);
create index if not exists idx_quiz_leads_tier on public.quiz_leads(tier);

alter table public.quiz_leads enable row level security;

-- Public quiz form: anyone can submit a lead, but leads are not publicly
-- readable. Only the service role (used by /admin) can read them.
create policy "quiz_leads_insert_anyone" on public.quiz_leads
  for insert with check (true);
