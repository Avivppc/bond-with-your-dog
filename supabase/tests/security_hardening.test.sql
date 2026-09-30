-- Review follow-ups: per-grant access accounting, paid-course free-enroll bypass,
-- lesson body privacy, and atomic webhook claiming.
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'overlap@test.dev'),
  ('00000000-0000-0000-0000-0000000000a8', 'freeloader@test.dev');

insert into public.courses (id, title, description, level, category, price, published) values
  ('sec-course', 'Sec course', 'd', 'Beginner', 'Foundations', 0, true);   -- legacy price 0 but sold in a paid offer
insert into public.modules (id, course_id, title, position, published)
  values ('e1000000-0000-0000-0000-000000000001', 'sec-course', 'M', 1, true);
insert into public.lessons (id, course_id, module_id, position, title, body_html)
  values ('f1000000-0000-0000-0000-000000000001', 'sec-course', 'e1000000-0000-0000-0000-000000000001', 1, 'Secret', '<p>paid text</p>');

insert into public.offers (id, slug, title, payment_type, price_cents, currency, status, days_of_access) values
  ('a3000000-0000-0000-0000-000000000001', 'sec-lifetime', 'Lifetime', 'one_time', 9900, 'USD', 'published', null),
  ('a3000000-0000-0000-0000-000000000002', 'sec-rental', '30-day rental', 'one_time', 900, 'USD', 'published', 30);
insert into public.offer_courses (offer_id, course_id) values
  ('a3000000-0000-0000-0000-000000000001', 'sec-course'),
  ('a3000000-0000-0000-0000-000000000002', 'sec-course');
insert into public.orders (id, user_id, offer_id, status, amount_cents, currency, provider) values
  ('b3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a7', 'a3000000-0000-0000-0000-000000000001', 'paid', 9900, 'USD', 'test'),
  ('b3000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a7', 'a3000000-0000-0000-0000-000000000002', 'paid', 900, 'USD', 'test'),
  ('b3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a7', 'a3000000-0000-0000-0000-000000000002', 'paid', 900, 'USD', 'test');

-- ── Overlapping purchases: each refund only removes its own grant ──
select public.grant_offer_access('00000000-0000-0000-0000-0000000000a7', 'a3000000-0000-0000-0000-000000000001', 'order',
                                 'b3000000-0000-0000-0000-000000000001', null);
select public.grant_offer_access('00000000-0000-0000-0000-0000000000a7', 'a3000000-0000-0000-0000-000000000002', 'order',
                                 'b3000000-0000-0000-0000-000000000002', now() + interval '30 days');
select public.revoke_offer_access('00000000-0000-0000-0000-0000000000a7', 'a3000000-0000-0000-0000-000000000002',
                                  'b3000000-0000-0000-0000-000000000002');
select t.ok((select expires_at is null from public.enrollments
             where user_id = '00000000-0000-0000-0000-0000000000a7' and course_id = 'sec-course'),
            'refunding the rental keeps the lifetime purchase');

-- A second, separate rental purchase (a refunded order is never re-activated).
select public.grant_offer_access('00000000-0000-0000-0000-0000000000a7', 'a3000000-0000-0000-0000-000000000002', 'order',
                                 'b3000000-0000-0000-0000-000000000003', now() + interval '30 days');
select public.revoke_offer_access('00000000-0000-0000-0000-0000000000a7', 'a3000000-0000-0000-0000-000000000001',
                                  'b3000000-0000-0000-0000-000000000001');
select t.ok((select expires_at between now() + interval '29 days' and now() + interval '31 days' from public.enrollments
             where user_id = '00000000-0000-0000-0000-0000000000a7' and course_id = 'sec-course'),
            'refunding the lifetime purchase falls back to the rental period (not lifetime, not nothing)');

select public.revoke_offer_access('00000000-0000-0000-0000-0000000000a7', 'a3000000-0000-0000-0000-000000000002',
                                  'b3000000-0000-0000-0000-000000000003');
select t.ok((select expires_at <= now() from public.enrollments
             where user_id = '00000000-0000-0000-0000-0000000000a7' and course_id = 'sec-course'),
            'refunding everything ends access');

-- A refunded order stays refunded even if its payment webhook is replayed
select public.grant_offer_access('00000000-0000-0000-0000-0000000000a7', 'a3000000-0000-0000-0000-000000000002', 'order',
                                 'b3000000-0000-0000-0000-000000000002', now() + interval '30 days');
select t.ok((select expires_at <= now() from public.enrollments
             where user_id = '00000000-0000-0000-0000-0000000000a7' and course_id = 'sec-course'),
            'replaying a refunded order does not re-open access');

-- Admin revoke of one course
select public.grant_offer_access('00000000-0000-0000-0000-0000000000a7', 'a3000000-0000-0000-0000-000000000001', 'grant', null, null);
select public.revoke_course_access('00000000-0000-0000-0000-0000000000a7', 'sec-course');
select t.ok((select expires_at <= now() from public.enrollments
             where user_id = '00000000-0000-0000-0000-0000000000a7' and course_id = 'sec-course'),
            'admin revoke ends every grant for that course');
select t.ok(not has_function_privilege('authenticated', 'public.revoke_course_access(uuid,text)', 'execute'),
            'clients cannot revoke');

-- Legacy enrollments without grants survive a recompute (backfilled)
insert into public.enrollments (user_id, course_id, source) values ('00000000-0000-0000-0000-0000000000a8', 'shop-b', 'legacy');
select private.backfill_access_grants();
select public.revoke_offer_access('00000000-0000-0000-0000-0000000000a8', 'a3000000-0000-0000-0000-000000000002', null);
select t.ok((select expires_at is null from public.enrollments
             where user_id = '00000000-0000-0000-0000-0000000000a8' and course_id = 'shop-b'),
            'unrelated legacy enrollment keeps lifetime access');

-- ── Free self-enroll cannot bypass a paid offer ──
set role authenticated;
select t.login('00000000-0000-0000-0000-0000000000a8');
select t.denied($$select public.enroll_free('sec-course')$$,
                'a course sold in a published paid offer is not free, whatever its legacy price');

-- ── Lesson body is server-only ──
select t.ok((select title from public.lessons where id = 'f1000000-0000-0000-0000-000000000001') = 'Secret',
            'lesson titles stay readable for outlines');
select t.denied($$select body_html from public.lessons$$, 'signed-in users cannot read lesson bodies directly');
set role anon;
select set_config('request.jwt.claims', '', false);
select t.denied($$select body_html from public.lessons$$, 'anon cannot read lesson bodies');
reset role;

-- ── Webhook processing is claimed atomically ──
insert into public.billing_events (provider, event_id, type) values ('paddle', 'evt_claim', 'transaction.completed');
select t.ok(public.claim_billing_event('paddle', 'evt_claim'), 'first worker claims the event');
select t.ok(not public.claim_billing_event('paddle', 'evt_claim'), 'a concurrent delivery cannot claim it again');
update public.billing_events set processed_at = now() where event_id = 'evt_claim';
select t.ok(not public.claim_billing_event('paddle', 'evt_claim'), 'processed events are never re-claimed');

-- ── Certificates ignore draft lessons ──
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a9', 'finisher@test.dev');
insert into public.courses (id, title, description, level, category, price, published)
  values ('cert-drafts', 'Cert with drafts', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.modules (id, course_id, title, position, published)
  values ('e2000000-0000-0000-0000-000000000001', 'cert-drafts', 'M', 1, true);
insert into public.lessons (id, course_id, module_id, position, title, published) values
  ('f2000000-0000-0000-0000-000000000001', 'cert-drafts', 'e2000000-0000-0000-0000-000000000001', 1, 'Live 1', true),
  ('f2000000-0000-0000-0000-000000000002', 'cert-drafts', 'e2000000-0000-0000-0000-000000000001', 2, 'Live 2', true),
  ('f2000000-0000-0000-0000-000000000003', 'cert-drafts', 'e2000000-0000-0000-0000-000000000001', 3, 'Still a draft', false);
set role authenticated;
select t.login('00000000-0000-0000-0000-0000000000a9');
select public.enroll_free('cert-drafts');
select public.complete_lesson('f2000000-0000-0000-0000-000000000001');
select public.complete_lesson('f2000000-0000-0000-0000-000000000002');
select t.ok((select count(*) from public.certificates where course_id = 'cert-drafts') = 1,
            'finishing every live lesson issues the certificate even with a draft lesson in the course');
reset role;

-- ── Admin student list ──
select t.ok((select count(*) from public.admin_list_students('finisher@', 50, 0)) = 1, 'student search by email');
select t.ok((select jsonb_array_length(enrollments) from public.admin_list_students('finisher@', 50, 0)) = 1,
            'student rows include their enrollments');
select t.ok(not has_function_privilege('authenticated', 'public.admin_list_students(text,integer,integer)', 'execute'),
            'student list is admin-only');
select t.ok((select count(*) from public.admin_user_emails(array(select id from auth.users where email like 'finisher@%'))) = 1,
            'order emails resolve by user id');
select t.ok(not has_function_privilege('authenticated', 'public.admin_user_emails(uuid[])', 'execute'),
            'email lookup is admin-only');
