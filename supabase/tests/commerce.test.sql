-- Stage B: offers, orders, subscriptions and access granting.
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'buyer@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'other@test.dev');

insert into public.courses (id, title, description, level, category, price, published) values
  ('shop-a', 'Course A', 'd', 'Beginner', 'Foundations', 49, true),
  ('shop-b', 'Course B', 'd', 'Beginner', 'Foundations', 49, true);
insert into public.modules (id, course_id, title, position, published)
  values ('e0000000-0000-0000-0000-000000000001', 'shop-a', 'M', 1, true);
insert into public.lessons (id, course_id, module_id, position, title)
  values ('f0000000-0000-0000-0000-000000000001', 'shop-a', 'e0000000-0000-0000-0000-000000000001', 1, 'Paid lesson');

-- Offer rules
select t.fails_with($$insert into public.offers (slug, title, payment_type, price_cents) values ('bad-free', 'x', 'free', 100)$$,
                    '23514', 'free offers cost 0');
select t.fails_with($$insert into public.offers (slug, title, payment_type, price_cents) values ('bad-paid', 'x', 'one_time', 0)$$,
                    '23514', 'paid offers need a price');
select t.fails_with($$insert into public.offers (slug, title, payment_type, price_cents) values ('bad-sub', 'x', 'subscription', 900)$$,
                    '23514', 'subscriptions need an interval');

insert into public.offers (id, slug, title, payment_type, price_cents, currency, status) values
  ('a1000000-0000-0000-0000-000000000001', 'bundle', 'A + B bundle', 'one_time', 9900, 'USD', 'published'),
  ('a1000000-0000-0000-0000-000000000002', 'hidden', 'Draft offer', 'one_time', 100, 'USD', 'draft');
insert into public.offers (id, slug, title, payment_type, price_cents, currency, interval, status) values
  ('a1000000-0000-0000-0000-000000000003', 'monthly', 'Membership', 'subscription', 1900, 'USD', 'month', 'published');
insert into public.offer_courses (offer_id, course_id) values
  ('a1000000-0000-0000-0000-000000000001', 'shop-a'), ('a1000000-0000-0000-0000-000000000001', 'shop-b'),
  ('a1000000-0000-0000-0000-000000000003', 'shop-a');

insert into public.orders (id, user_id, offer_id, status, amount_cents, currency, provider)
  values ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1',
          'a1000000-0000-0000-0000-000000000001', 'pending', 9900, 'USD', 'test');

-- Granting access (server-only function)
select t.ok(public.grant_offer_access('00000000-0000-0000-0000-0000000000b1', 'a1000000-0000-0000-0000-000000000001',
                                      'order', 'b1000000-0000-0000-0000-000000000001', null) = 2,
            'a bundle grants every course in the offer');
select t.ok(public.grant_offer_access('00000000-0000-0000-0000-0000000000b1', 'a1000000-0000-0000-0000-000000000001',
                                      'order', 'b1000000-0000-0000-0000-000000000001', null) = 0,
            'granting twice is idempotent');
select public.grant_offer_access('00000000-0000-0000-0000-0000000000b1', 'a1000000-0000-0000-0000-000000000003',
                                 'subscription', null, now() + interval '30 days');
select t.ok((select expires_at is null from public.enrollments
             where user_id = '00000000-0000-0000-0000-0000000000b1' and course_id = 'shop-a'),
            'a dated grant never shortens lifetime access');

select public.grant_offer_access('00000000-0000-0000-0000-0000000000b2', 'a1000000-0000-0000-0000-000000000003',
                                 'subscription', null, now() + interval '10 days');
select public.grant_offer_access('00000000-0000-0000-0000-0000000000b2', 'a1000000-0000-0000-0000-000000000003',
                                 'subscription', null, now() + interval '40 days');
select t.ok((select expires_at > now() + interval '39 days' from public.enrollments
             where user_id = '00000000-0000-0000-0000-0000000000b2' and course_id = 'shop-a'),
            'renewals extend dated access');
select t.ok((select count(*) from public.events where type = 'access.granted'
             and user_id = '00000000-0000-0000-0000-0000000000b1') = 2, 'access.granted emitted per new course');

-- Revoking (refund) only affects enrollments that came from that order
select public.revoke_offer_access('00000000-0000-0000-0000-0000000000b1', 'a1000000-0000-0000-0000-000000000001',
                                  'b1000000-0000-0000-0000-000000000001');
select t.ok((select bool_and(expires_at <= now()) from public.enrollments
             where user_id = '00000000-0000-0000-0000-0000000000b1' and order_id = 'b1000000-0000-0000-0000-000000000001'),
            'refund ends access granted by that order');

-- Payment events are processed once
insert into public.billing_events (provider, event_id, type) values ('paddle', 'evt_1', 'transaction.completed');
select t.fails_with($$insert into public.billing_events (provider, event_id, type) values ('paddle', 'evt_1', 'transaction.completed')$$,
                    '23505', 'duplicate webhook deliveries are rejected');

-- Client visibility
set role anon;
select set_config('request.jwt.claims', '', false);
select t.ok((select count(*) from public.offers where slug in ('bundle', 'hidden', 'monthly')) = 2,
            'anyone can read published offers (pricing pages), not drafts');
select t.ok((select count(*) from public.offer_courses where course_id in ('shop-a', 'shop-b')) = 3, 'offer contents are public');

set role authenticated;
select t.login('00000000-0000-0000-0000-0000000000b1');
select t.ok((select count(*) from public.orders) = 1, 'buyers see their own orders');
select t.denied($$update public.orders set status = 'paid'$$, 'buyers cannot mark orders paid');
select t.denied($$insert into public.orders (user_id, offer_id, status, amount_cents, currency, provider)
                  values ('00000000-0000-0000-0000-0000000000b1', 'a1000000-0000-0000-0000-000000000001', 'paid', 0, 'USD', 'test')$$,
                'buyers cannot create paid orders');
select t.denied($$select count(*) from public.billing_events$$, 'billing events are server-only');
select t.ok(not has_function_privilege('authenticated', 'public.grant_offer_access(uuid,uuid,text,uuid,timestamptz)', 'execute'),
            'clients cannot grant access');
select t.login('00000000-0000-0000-0000-0000000000b2');
select t.ok((select count(*) from public.orders) = 0, 'orders are private');

reset role;
