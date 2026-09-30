-- ============================================================
-- Analytics & reports (Kajabi Analytics → Overview / Reports)
--   * payments: a ledger with one row per charge (first purchase or renewal) and per refund,
--     keyed by a unique event_key so webhook replays can't double count.
--   * admin_* reporting functions (service role only). Periods are [p_from, p_to);
--     buckets are UTC day / week / month with zero rows for empty buckets.
-- Tests: supabase/tests/analytics.test.sql
-- ============================================================

alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists refunded_at timestamptz;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null,
  provider_ref text,
  kind text not null check (kind in ('charge', 'refund')),
  amount_cents int not null check (amount_cents >= 0),
  currency text not null,
  payment_method text,
  is_renewal boolean not null default false,
  occurred_at timestamptz not null default now()
);
create index if not exists payments_occurred on public.payments (currency, occurred_at);
create index if not exists payments_user on public.payments (user_id);
create index if not exists payments_offer on public.payments (offer_id);
alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;

-- Existing orders become ledger rows (paid → charge; refunded → charge + refund).
insert into public.payments (event_key, user_id, offer_id, order_id, provider, provider_ref, kind, amount_cents, currency, payment_method, occurred_at)
select 'charge:order:' || o.id, o.user_id, o.offer_id, o.id, o.provider, o.provider_ref, 'charge', o.amount_cents, o.currency,
       coalesce(o.payment_method, case o.provider when 'free' then 'free' when 'test' then 'test' else null end),
       coalesce(o.paid_at, o.created_at)
  from public.orders o
 where o.status in ('paid', 'refunded')
on conflict (event_key) do nothing;
insert into public.payments (event_key, user_id, offer_id, order_id, provider, provider_ref, kind, amount_cents, currency, payment_method, occurred_at)
select 'refund:order:' || o.id, o.user_id, o.offer_id, o.id, o.provider, o.provider_ref, 'refund', o.amount_cents, o.currency,
       o.payment_method, coalesce(o.refunded_at, o.paid_at, o.created_at)
  from public.orders o
 where o.status = 'refunded'
on conflict (event_key) do nothing;

-- ── Helpers ─────────────────────────────────────────────────
create or replace function private.analytics_buckets(p_from timestamptz, p_to timestamptz, p_bucket text)
returns table (bucket timestamptz)
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_bucket not in ('day', 'week', 'month') then
    raise exception 'bucket must be day, week or month' using errcode = '22023';
  end if;
  return query
    select g from generate_series(date_trunc(p_bucket, p_from), p_to - interval '1 second', ('1 ' || p_bucket)::interval) g;
end;
$$;

-- ── Revenue ─────────────────────────────────────────────────
create or replace function public.admin_revenue_totals(p_from timestamptz, p_to timestamptz, p_currency text)
returns table (gross_cents bigint, refund_cents bigint, charges bigint, refunds bigint, paying_customers bigint, free_purchases bigint)
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(amount_cents) filter (where kind = 'charge'), 0),
         coalesce(sum(amount_cents) filter (where kind = 'refund'), 0),
         count(*) filter (where kind = 'charge' and amount_cents > 0),
         count(*) filter (where kind = 'refund'),
         count(distinct user_id) filter (where kind = 'charge' and amount_cents > 0),
         count(*) filter (where kind = 'charge' and amount_cents = 0 and not is_renewal)
    from public.payments
   where currency = p_currency and occurred_at >= p_from and occurred_at < p_to;
$$;

create or replace function public.admin_revenue_series(p_from timestamptz, p_to timestamptz, p_bucket text, p_currency text)
returns table (bucket timestamptz, gross_cents bigint, refund_cents bigint, charges bigint, refunds bigint)
language sql stable security definer set search_path = ''
as $$
  select b.bucket,
         coalesce(sum(p.amount_cents) filter (where p.kind = 'charge'), 0),
         coalesce(sum(p.amount_cents) filter (where p.kind = 'refund'), 0),
         count(p.id) filter (where p.kind = 'charge' and p.amount_cents > 0),
         count(p.id) filter (where p.kind = 'refund')
    from private.analytics_buckets(p_from, p_to, p_bucket) b
    left join public.payments p
      on p.currency = p_currency and date_trunc(p_bucket, p.occurred_at) = b.bucket
     and p.occurred_at >= p_from and p.occurred_at < p_to
   group by b.bucket
   order by b.bucket;
$$;

create or replace function public.admin_top_offers(p_from timestamptz, p_to timestamptz, p_currency text, p_limit int)
returns table (offer_id uuid, title text, gross_cents bigint, refund_cents bigint, purchases bigint)
language sql stable security definer set search_path = ''
as $$
  select o.id, o.title,
         coalesce(sum(p.amount_cents) filter (where p.kind = 'charge'), 0),
         coalesce(sum(p.amount_cents) filter (where p.kind = 'refund'), 0),
         count(*) filter (where p.kind = 'charge' and not p.is_renewal)
    from public.payments p
    join public.offers o on o.id = p.offer_id
   where p.currency = p_currency and p.occurred_at >= p_from and p.occurred_at < p_to
   group by o.id, o.title
   order by 3 desc, 5 desc
   limit greatest(1, least(coalesce(p_limit, 10), 100));
$$;

create or replace function public.admin_revenue_by_method(p_from timestamptz, p_to timestamptz, p_currency text)
returns table (method text, gross_cents bigint, payments bigint)
language sql stable security definer set search_path = ''
as $$
  select coalesce(payment_method, 'other'), sum(amount_cents), count(*)
    from public.payments
   where kind = 'charge' and amount_cents > 0 and currency = p_currency and occurred_at >= p_from and occurred_at < p_to
   group by 1
   order by 2 desc;
$$;

create or replace function public.admin_top_customers(p_from timestamptz, p_to timestamptz, p_currency text, p_limit int)
returns table (user_id uuid, email text, gross_cents bigint, refund_cents bigint, net_cents bigint, payments bigint)
language sql stable security definer set search_path = ''
as $$
  select p.user_id, u.email::text,
         coalesce(sum(p.amount_cents) filter (where p.kind = 'charge'), 0),
         coalesce(sum(p.amount_cents) filter (where p.kind = 'refund'), 0),
         coalesce(sum(p.amount_cents) filter (where p.kind = 'charge'), 0) - coalesce(sum(p.amount_cents) filter (where p.kind = 'refund'), 0),
         count(*) filter (where p.kind = 'charge' and p.amount_cents > 0)
    from public.payments p
    join auth.users u on u.id = p.user_id
   where p.currency = p_currency and p.occurred_at >= p_from and p.occurred_at < p_to
   group by p.user_id, u.email
  having coalesce(sum(p.amount_cents) filter (where p.kind = 'charge'), 0) > 0
   order by 5 desc
   limit greatest(1, least(coalesce(p_limit, 10), 500));
$$;

create or replace function public.admin_offer_purchases_series(p_from timestamptz, p_to timestamptz, p_bucket text, p_currency text)
returns table (bucket timestamptz, paid_purchases bigint, free_purchases bigint, gross_cents bigint)
language sql stable security definer set search_path = ''
as $$
  select b.bucket,
         count(p.id) filter (where p.amount_cents > 0),
         count(p.id) filter (where p.amount_cents = 0),
         coalesce(sum(p.amount_cents), 0)
    from private.analytics_buckets(p_from, p_to, p_bucket) b
    left join public.payments p
      on p.kind = 'charge' and not p.is_renewal and p.currency = p_currency
     and date_trunc(p_bucket, p.occurred_at) = b.bucket and p.occurred_at >= p_from and p.occurred_at < p_to
   group by b.bucket
   order by b.bucket;
$$;

create or replace function public.admin_currencies()
returns table (currency text, payments bigint)
language sql stable security definer set search_path = ''
as $$
  select currency, count(*) from public.payments group by currency order by 2 desc;
$$;

-- ── People ──────────────────────────────────────────────────
create or replace function public.admin_contacts_series(p_from timestamptz, p_to timestamptz, p_bucket text)
returns table (bucket timestamptz, signups bigint, leads bigint)
language sql stable security definer set search_path = ''
as $$
  select b.bucket,
         (select count(*) from auth.users u
           where date_trunc(p_bucket, u.created_at) = b.bucket and u.created_at >= p_from and u.created_at < p_to),
         (select count(*) from public.quiz_leads l
           where date_trunc(p_bucket, l.created_at) = b.bucket and l.created_at >= p_from and l.created_at < p_to)
    from private.analytics_buckets(p_from, p_to, p_bucket) b
   order by b.bucket;
$$;

-- ── Subscriptions ───────────────────────────────────────────
create or replace function public.admin_subscription_status()
returns table (status text, subscriptions bigint)
language sql stable security definer set search_path = ''
as $$
  select case when s.status in ('active', 'trialing') and s.canceled_at is not null then 'pending_cancellation' else s.status end,
         count(*)
    from public.subscriptions s
   group by 1;
$$;

create or replace function public.admin_subscriptions_series(p_from timestamptz, p_to timestamptz, p_bucket text)
returns table (bucket timestamptz, started bigint, canceled bigint)
language sql stable security definer set search_path = ''
as $$
  select b.bucket,
         (select count(*) from public.subscriptions s
           where date_trunc(p_bucket, s.created_at) = b.bucket and s.created_at >= p_from and s.created_at < p_to),
         (select count(*) from public.subscriptions s
           where s.canceled_at is not null and date_trunc(p_bucket, s.canceled_at) = b.bucket
             and s.canceled_at >= p_from and s.canceled_at < p_to)
    from private.analytics_buckets(p_from, p_to, p_bucket) b
   order by b.bucket;
$$;

-- Churn = subscriptions canceled in the period / subscriptions active when it started.
create or replace function public.admin_churn(p_from timestamptz, p_to timestamptz)
returns table (active_at_start bigint, canceled bigint, rate numeric)
language sql stable security definer set search_path = ''
as $$
  with base as (
    select count(*) filter (where created_at < p_from and (canceled_at is null or canceled_at >= p_from)) as active_at_start,
           count(*) filter (where canceled_at >= p_from and canceled_at < p_to) as canceled
      from public.subscriptions
  )
  select active_at_start, canceled, case when active_at_start = 0 then 0 else round(canceled::numeric / active_at_start, 4) end
    from base;
$$;

-- Monthly cohorts: how many of each month's new subscribers were still active k months later.
create or replace function public.admin_subscription_retention(p_from timestamptz, p_to timestamptz, p_months int)
returns table (cohort timestamptz, subscribers bigint, retained bigint[])
language sql stable security definer set search_path = ''
as $$
  with subs as (
    select date_trunc('month', created_at) as cohort, canceled_at
      from public.subscriptions
     where created_at >= p_from and created_at < p_to
  )
  select c.cohort,
         count(*),
         array(
           select (select count(*) from subs s
                    where s.cohort = c.cohort
                      and (s.canceled_at is null or s.canceled_at >= c.cohort + make_interval(months => k)))
             from generate_series(1, greatest(1, least(coalesce(p_months, 6), 24))) k
            order by k
         )
    from subs c
   group by c.cohort
   order by c.cohort;
$$;

-- ── Learning ────────────────────────────────────────────────
create or replace function public.admin_completions_series(p_from timestamptz, p_to timestamptz, p_bucket text)
returns table (bucket timestamptz, completions bigint, learners bigint)
language sql stable security definer set search_path = ''
as $$
  select b.bucket, count(lp.id), count(distinct lp.user_id)
    from private.analytics_buckets(p_from, p_to, p_bucket) b
    left join public.lesson_progress lp
      on lp.completed_at is not null and date_trunc(p_bucket, lp.completed_at) = b.bucket
     and lp.completed_at >= p_from and lp.completed_at < p_to
   group by b.bucket
   order by b.bucket;
$$;

create or replace function public.admin_course_progress()
returns table (course_id text, title text, active_students bigint, started bigint, finished bigint, avg_percent numeric)
language sql stable security definer set search_path = ''
as $$
  with live as (
    select c.id as course_id, count(l.id) as lessons
      from public.courses c
      left join public.lessons l on l.course_id = c.id and l.published
     group by c.id
  ), per_student as (
    select e.course_id, e.user_id,
           (select count(*) from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
             where lp.user_id = e.user_id and l.course_id = e.course_id and l.published and lp.completed_at is not null) as done
      from public.enrollments e
     where e.expires_at is null or e.expires_at > now()
  )
  select c.id, c.title,
         count(ps.user_id),
         count(ps.user_id) filter (where ps.done > 0),
         count(ps.user_id) filter (where live.lessons > 0 and ps.done >= live.lessons),
         coalesce(round(avg(case when live.lessons > 0 then ps.done::numeric * 100 / live.lessons end), 1), 0)
    from public.courses c
    join live on live.course_id = c.id
    left join per_student ps on ps.course_id = c.id
   group by c.id, c.title
   order by 3 desc, c.title;
$$;

-- ── Grants: admin (service role) only ───────────────────────
do $$
declare
  f text;
begin
  foreach f in array array[
    'private.analytics_buckets(timestamptz, timestamptz, text)',
    'public.admin_revenue_totals(timestamptz, timestamptz, text)',
    'public.admin_revenue_series(timestamptz, timestamptz, text, text)',
    'public.admin_top_offers(timestamptz, timestamptz, text, int)',
    'public.admin_revenue_by_method(timestamptz, timestamptz, text)',
    'public.admin_top_customers(timestamptz, timestamptz, text, int)',
    'public.admin_offer_purchases_series(timestamptz, timestamptz, text, text)',
    'public.admin_currencies()',
    'public.admin_contacts_series(timestamptz, timestamptz, text)',
    'public.admin_subscription_status()',
    'public.admin_subscriptions_series(timestamptz, timestamptz, text)',
    'public.admin_churn(timestamptz, timestamptz)',
    'public.admin_subscription_retention(timestamptz, timestamptz, int)',
    'public.admin_completions_series(timestamptz, timestamptz, text)',
    'public.admin_course_progress()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    if f like 'public.%' then
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;
