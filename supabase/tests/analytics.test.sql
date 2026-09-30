-- Analytics: the payments ledger and the admin_* reporting functions.
-- Isolation from other suites: money uses the ISO test currency XTS, people/events are dated 2031.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-00000000a501', 'a-big@test.dev', '2031-01-03'),
  ('00000000-0000-0000-0000-00000000a502', 'a-small@test.dev', '2031-01-10'),
  ('00000000-0000-0000-0000-00000000a503', 'a-sub@test.dev', '2031-02-01');
insert into public.quiz_leads (first_name, email, tier, scores, answers, created_at) values
  ('Lead', 'lead-2031@test.dev', 'foundations', '{}', '{}', '2031-01-05');

insert into public.offers (id, slug, title, payment_type, price_cents, currency, status, interval) values
  ('a5000000-0000-0000-0000-000000000001', 'an-course', 'Course offer', 'one_time', 10000, 'XTS', 'published', null),
  ('a5000000-0000-0000-0000-000000000002', 'an-club', 'Club', 'subscription', 2000, 'XTS', 'published', 'month');

insert into public.subscriptions (id, user_id, offer_id, provider, provider_ref, status, created_at, canceled_at) values
  ('a5100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000a503', 'a5000000-0000-0000-0000-000000000002',
   'test', 'sub_an_1', 'canceled', '2031-01-15', '2031-03-20'),
  ('a5100000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000a502', 'a5000000-0000-0000-0000-000000000002',
   'test', 'sub_an_2', 'active', '2031-01-20', null);

insert into public.payments (event_key, user_id, offer_id, subscription_id, provider, provider_ref, kind, amount_cents, currency, payment_method, is_renewal, occurred_at) values
  ('an:1', '00000000-0000-0000-0000-00000000a501', 'a5000000-0000-0000-0000-000000000001', null, 'test', 'txn_an_1', 'charge', 10000, 'XTS', 'card', false, '2031-01-04 10:00'),
  ('an:2', '00000000-0000-0000-0000-00000000a502', 'a5000000-0000-0000-0000-000000000001', null, 'test', 'txn_an_2', 'charge', 10000, 'XTS', 'paypal', false, '2031-01-11 10:00'),
  ('an:3', '00000000-0000-0000-0000-00000000a502', 'a5000000-0000-0000-0000-000000000001', null, 'test', 'txn_an_2', 'refund', 4000, 'XTS', 'paypal', false, '2031-01-12 10:00'),
  ('an:4', '00000000-0000-0000-0000-00000000a503', 'a5000000-0000-0000-0000-000000000002', 'a5100000-0000-0000-0000-000000000001', 'test', 'txn_an_3', 'charge', 2000, 'XTS', 'card', false, '2031-01-15 10:00'),
  ('an:5', '00000000-0000-0000-0000-00000000a503', 'a5000000-0000-0000-0000-000000000002', 'a5100000-0000-0000-0000-000000000001', 'test', 'txn_an_4', 'charge', 2000, 'XTS', 'card', true, '2031-02-15 10:00'),
  ('an:6', '00000000-0000-0000-0000-00000000a501', 'a5000000-0000-0000-0000-000000000001', null, 'free', null, 'charge', 0, 'XTS', 'free', false, '2031-01-06 10:00');

-- Ledger keys make webhook replays harmless.
select t.fails_with($$insert into public.payments (event_key, provider, kind, amount_cents, currency) values ('an:1', 'test', 'charge', 1, 'XTS')$$,
                    '23505', 'a payment event is recorded once');

-- ── Totals ──
select t.ok((select gross_cents from public.admin_revenue_totals('2031-01-01', '2031-02-01', 'XTS')) = 22000, 'gross revenue for January');
select t.ok((select refund_cents from public.admin_revenue_totals('2031-01-01', '2031-02-01', 'XTS')) = 4000, 'refunds for January');
select t.ok((select paying_customers from public.admin_revenue_totals('2031-01-01', '2031-02-01', 'XTS')) = 3, 'paying customers');
select t.ok((select free_purchases from public.admin_revenue_totals('2031-01-01', '2031-02-01', 'XTS')) = 1, 'free purchases are counted apart');

-- ── Series: one row per bucket, zeros included ──
select t.ok((select count(*) from public.admin_revenue_series('2031-01-01', '2031-03-31', 'month', 'XTS')) = 3, 'one bucket per month');
select t.ok((select gross_cents from public.admin_revenue_series('2031-01-01', '2031-03-31', 'month', 'XTS') where bucket = '2031-02-01') = 2000,
            'renewals count as revenue in their month');
select t.ok((select gross_cents from public.admin_revenue_series('2031-01-01', '2031-03-31', 'month', 'XTS') where bucket = '2031-03-01') = 0,
            'empty months are zero, not missing');
select t.fails_with($$select * from public.admin_revenue_series('2031-01-01', '2031-03-31', 'hour', 'XTS')$$, '22023', 'only day/week/month buckets');

-- ── Breakdowns ──
select t.ok((select title from public.admin_top_offers('2031-01-01', '2032-01-01', 'XTS', 5) limit 1) = 'Course offer', 'top offer by revenue');
select t.ok((select purchases from public.admin_top_offers('2031-01-01', '2032-01-01', 'XTS', 5) where title = 'Club') = 1,
            'renewals are revenue but not new purchases');
select t.ok((select gross_cents from public.admin_revenue_by_method('2031-01-01', '2032-01-01', 'XTS') where method = 'card') = 14000, 'revenue by payment method');
select t.ok((select email from public.admin_top_customers('2031-01-01', '2032-01-01', 'XTS', 5) limit 1) = 'a-big@test.dev', 'top customer by spend');
select t.ok((select net_cents from public.admin_top_customers('2031-01-01', '2032-01-01', 'XTS', 5) where email = 'a-small@test.dev') = 6000,
            'customer spend is net of refunds');
select t.ok((select array_agg(currency) from public.admin_currencies()) @> array['XTS'], 'currencies seen in payments');

-- ── People ──
select t.ok((select sum(signups) from public.admin_contacts_series('2031-01-01', '2031-01-31', 'month')) = 2, 'signups in January');
select t.ok((select sum(leads) from public.admin_contacts_series('2031-01-01', '2031-01-31', 'month')) = 1, 'quiz leads in January');

-- ── Subscriptions ──
select t.ok((select sum(started) from public.admin_subscriptions_series('2031-01-01', '2031-03-31', 'month')) = 2, 'subscriptions started');
select t.ok((select sum(canceled) from public.admin_subscriptions_series('2031-01-01', '2031-03-31', 'month')) = 1, 'subscriptions canceled');
select t.ok((select canceled from public.admin_churn('2031-03-01', '2031-04-01')) = 1, 'churn counts cancellations in the period');
select t.ok((select active_at_start from public.admin_churn('2031-03-01', '2031-04-01')) = 2, 'churn base = active at the start');
select t.ok((select subscribers from public.admin_subscription_retention('2031-01-01', '2031-02-01', 3)) = 2, 'January cohort size');
select t.ok((select retained[3] from public.admin_subscription_retention('2031-01-01', '2031-02-01', 3)) = 1, 'one of two still active after 3 months');

-- ── Access ──
select t.ok(not has_function_privilege('authenticated', 'public.admin_revenue_totals(timestamptz,timestamptz,text)', 'execute'), 'analytics are admin-only');
set role authenticated;
select t.denied($$select * from public.payments$$, 'clients cannot read the payments ledger');
reset role;
