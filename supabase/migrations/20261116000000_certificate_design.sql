-- Admin → Settings → Certificate: one design (wording, signer, colour, what to show) used by the
-- certificate page and its PDF. src/lib/certificates/design.ts holds the defaults and the rules;
-- an empty row means "the defaults". Only the server reads and writes it.

create table if not exists public.certificate_design (
  id int primary key default 1 check (id = 1),
  design jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.certificate_design enable row level security;
revoke all on public.certificate_design from anon, authenticated;

insert into public.certificate_design (id) values (1) on conflict (id) do nothing;
