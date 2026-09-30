-- ============================================================
-- Stage B: commerce
--   offers (the price) ↔ courses (the content), many-to-many — like Kajabi
--   orders / subscriptions written only by the server (payment webhooks, admin)
--   billing_events: every provider webhook recorded once (idempotency + audit)
--   grant_offer_access / revoke_offer_access: the only way access is sold/refunded
-- Tests: supabase/tests/commerce.test.sql
-- ============================================================

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title text not null,
  description text,
  payment_type text not null check (payment_type in ('free', 'one_time', 'subscription')),
  price_cents int not null default 0 check (price_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  interval text check (interval in ('month', 'year')),
  days_of_access int check (days_of_access > 0),          -- one-time offers: null = lifetime
  status text not null default 'draft' check (status in ('draft', 'published')),
  provider_price_id text,                                  -- e.g. Paddle price id (pri_…)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_price_matches_type check (
    (payment_type = 'free' and price_cents = 0) or (payment_type <> 'free' and price_cents > 0)
  ),
  constraint offers_interval_matches_type check (
    (payment_type = 'subscription') = (interval is not null)
  )
);

create table if not exists public.offer_courses (
  offer_id uuid not null references public.offers(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  primary key (offer_id, course_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete restrict,
  status text not null check (status in ('pending', 'paid', 'refunded', 'canceled', 'failed')),
  amount_cents int not null check (amount_cents >= 0),
  currency text not null,
  provider text not null check (provider in ('paddle', 'test', 'free', 'manual')),
  provider_ref text unique,                                -- provider transaction id
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_orders_user on public.orders(user_id, created_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  provider text not null,
  provider_ref text not null unique,                       -- provider subscription id
  status text not null check (status in ('active', 'trialing', 'past_due', 'paused', 'canceled')),
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_id text not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (provider, event_id)
);

alter table public.enrollments add column if not exists order_id uuid references public.orders(id) on delete set null;

-- ── RLS ─────────────────────────────────────────────────────
alter table public.offers enable row level security;
alter table public.offer_courses enable row level security;
alter table public.orders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "offers_read_published" on public.offers;
create policy "offers_read_published" on public.offers for select
  using (status = 'published' or public.current_staff_role() is not null);

drop policy if exists "offer_courses_read" on public.offer_courses;
create policy "offer_courses_read" on public.offer_courses for select
  using (exists (select 1 from public.offers o where o.id = offer_id
                 and (o.status = 'published' or public.current_staff_role() is not null)));

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid() = user_id);

revoke insert, update, delete, truncate on public.offers, public.offer_courses, public.orders, public.subscriptions
  from anon, authenticated;
revoke all on public.billing_events from anon, authenticated;

-- ── Access granting ─────────────────────────────────────────
-- Grants every course in the offer. A dated grant (subscription period, limited
-- access) never shortens lifetime access and only ever extends a dated one.
create or replace function public.grant_offer_access(
  p_user_id uuid, p_offer_id uuid, p_source text, p_order_id uuid, p_expires_at timestamptz
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course text;
  v_new boolean;
  v_created int := 0;
begin
  for v_course in select course_id from public.offer_courses where offer_id = p_offer_id loop
    insert into public.enrollments (user_id, course_id, source, order_id, expires_at)
    values (p_user_id, v_course, p_source, p_order_id, p_expires_at)
    on conflict (user_id, course_id) do update
      set expires_at = case
            when public.enrollments.expires_at is null and public.enrollments.enrolled_at <= now() then null
            when excluded.expires_at is null then null
            else greatest(public.enrollments.expires_at, excluded.expires_at)
          end,
          order_id = coalesce(excluded.order_id, public.enrollments.order_id),
          source = case when public.enrollments.expires_at is null then public.enrollments.source else excluded.source end
    returning (xmax = 0) into v_new;

    if v_new then
      v_created := v_created + 1;
      perform private.emit_event('access.granted', p_user_id, 'course', v_course,
                                 jsonb_build_object('offer_id', p_offer_id, 'source', p_source, 'order_id', p_order_id));
    end if;
  end loop;
  return v_created;
end;
$$;

-- Ends access that came from one order (refund / chargeback / admin revoke).
create or replace function public.revoke_offer_access(p_user_id uuid, p_offer_id uuid, p_order_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.enrollments e
     set expires_at = now()
   where e.user_id = p_user_id
     and e.course_id in (select course_id from public.offer_courses where offer_id = p_offer_id)
     and (p_order_id is null or e.order_id = p_order_id)
     and (e.expires_at is null or e.expires_at > now());
  get diagnostics v_count = row_count;
  perform private.emit_event('access.revoked', p_user_id, 'offer', p_offer_id::text,
                             jsonb_build_object('order_id', p_order_id, 'courses', v_count));
  return v_count;
end;
$$;

revoke all on function public.grant_offer_access(uuid, uuid, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.revoke_offer_access(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_offer_access(uuid, uuid, text, uuid, timestamptz) to service_role;
grant execute on function public.revoke_offer_access(uuid, uuid, uuid) to service_role;
