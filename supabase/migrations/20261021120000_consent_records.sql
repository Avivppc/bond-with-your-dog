-- ============================================================
-- Cookie consent log: one row per choice a visitor makes in the cookie banner
-- or "Cookie settings". It is the proof of consent GDPR asks for: who (consent
-- id, and the member if signed in), what (categories), when, under which policy
-- revision, and which regional rule applied. No IP address or user agent is kept.
-- Written by POST /api/consent; read only with the service role (admin).
-- ============================================================

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  consent_id uuid not null,
  categories text[] not null check (cardinality(categories) <= 10),
  accept_type text not null check (accept_type in ('all', 'necessary', 'custom')),
  policy text not null check (policy in ('opt_in', 'opt_out')),
  revision integer not null check (revision >= 0),
  country text check (country ~ '^[A-Z]{2}$'),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_consent_records_consent_id on public.consent_records (consent_id, created_at desc);
create index if not exists idx_consent_records_user_id on public.consent_records (user_id) where user_id is not null;

alter table public.consent_records enable row level security;

-- Anyone may record their own choice; a signed-in member can only attach their own id.
-- No select policy: the log is not readable through the public API.
drop policy if exists "consent_records_insert_own" on public.consent_records;
create policy "consent_records_insert_own" on public.consent_records
  for insert with check (user_id is null or user_id = auth.uid());
