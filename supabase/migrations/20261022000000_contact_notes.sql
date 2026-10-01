-- Kajabi-style private notes on a contact ("Called about the refund", "Prefers WhatsApp").
-- Written and read only by staff through the admin (service role, behind requireStaff('sales')),
-- so clients get no access at all.

create table if not exists public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists contact_notes_contact_idx on public.contact_notes (contact_id, created_at desc);

alter table public.contact_notes enable row level security;
revoke all on public.contact_notes from anon, authenticated;
