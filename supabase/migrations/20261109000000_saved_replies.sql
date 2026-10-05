-- Saved replies: texts the team reuses when answering members (video feedback, lesson questions,
-- the inbox). Written and read only by staff through the admin (service role, behind
-- requireStaff('content')), so clients get no access at all.

create table if not exists public.saved_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_replies enable row level security;
revoke all on public.saved_replies from anon, authenticated;
