-- Affiliates (Kajabi parity): partners share bonded.dog/a/<code>; a purchase within 30 days earns
-- them a commission, which the team pays by hand and marks paid. Separate from "refer a friend"
-- (members' discounts and rewards).
--   1. affiliates               who, their code, commission %
--   2. affiliate_visits         link visits per day (for their conversion rate)
--   3. orders.affiliate_id      the affiliate a purchase came through
--   4. affiliate_commissions    one per paid order: pending → paid, or void when refunded
-- Only the server reads and writes these (service role); affiliates see their own numbers through it.

-- ── 1. Affiliates ───────────────────────────────────────────────────────────
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  user_id uuid references auth.users(id) on delete set null,
  code text not null check (code ~ '^[a-z0-9][a-z0-9-]{2,29}$'),
  commission_percent int not null check (commission_percent between 1 and 90),
  active boolean not null default true,
  note text check (char_length(note) <= 200),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists affiliates_code_key on public.affiliates (code);
create unique index if not exists affiliates_email_key on public.affiliates (lower(email));
alter table public.affiliates enable row level security;
revoke all on public.affiliates from anon, authenticated;

-- ── 2. Visits ───────────────────────────────────────────────────────────────
create table if not exists public.affiliate_visits (
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  visited_on date not null default current_date,
  visits int not null default 0 check (visits >= 0),
  primary key (affiliate_id, visited_on)
);
alter table public.affiliate_visits enable row level security;
revoke all on public.affiliate_visits from anon, authenticated;

-- A visit through a link: the affiliate's id when the code is live (and the day's count goes up).
create or replace function public.record_affiliate_visit(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  select id into v_id from public.affiliates where code = lower(btrim(p_code)) and active;
  if v_id is null then return null; end if;
  insert into public.affiliate_visits (affiliate_id, visited_on, visits) values (v_id, current_date, 1)
  on conflict (affiliate_id, visited_on) do update set visits = public.affiliate_visits.visits + 1;
  return v_id;
end;
$$;
revoke all on function public.record_affiliate_visit(text) from public, anon, authenticated;
grant execute on function public.record_affiliate_visit(text) to service_role;

-- ── 3. Orders ───────────────────────────────────────────────────────────────
alter table public.orders add column if not exists affiliate_id uuid references public.affiliates(id) on delete set null;
create index if not exists orders_affiliate on public.orders (affiliate_id) where affiliate_id is not null;

-- ── 4. Commissions ──────────────────────────────────────────────────────────
create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  base_cents int not null check (base_cents >= 0),
  percent int not null check (percent between 1 and 90),
  amount_cents int not null check (amount_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'void')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  voided_at timestamptz
);
create unique index if not exists affiliate_commissions_order_key on public.affiliate_commissions (order_id);
create index if not exists affiliate_commissions_affiliate on public.affiliate_commissions (affiliate_id, created_at desc);
alter table public.affiliate_commissions enable row level security;
revoke all on public.affiliate_commissions from anon, authenticated;

-- Per affiliate: visits, sales, and commissions by status (the admin list and the affiliate's page).
create or replace function public.affiliate_stats(p_affiliate_id uuid)
returns table (visits bigint, sales bigint, pending_cents bigint, paid_cents bigint, void_cents bigint)
language sql stable security definer set search_path = '' as $$
  select
    coalesce((select sum(v.visits) from public.affiliate_visits v where v.affiliate_id = p_affiliate_id), 0),
    (select count(*) from public.affiliate_commissions c where c.affiliate_id = p_affiliate_id and c.status <> 'void'),
    coalesce((select sum(c.amount_cents) from public.affiliate_commissions c where c.affiliate_id = p_affiliate_id and c.status = 'pending'), 0),
    coalesce((select sum(c.amount_cents) from public.affiliate_commissions c where c.affiliate_id = p_affiliate_id and c.status = 'paid'), 0),
    coalesce((select sum(c.amount_cents) from public.affiliate_commissions c where c.affiliate_id = p_affiliate_id and c.status = 'void'), 0);
$$;
revoke all on function public.affiliate_stats(uuid) from public, anon, authenticated;
grant execute on function public.affiliate_stats(uuid) to service_role;
