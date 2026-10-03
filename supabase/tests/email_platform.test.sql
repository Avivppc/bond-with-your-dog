-- Email platform: triggers for every kind of flow, campaign audiences, unsubscribes by address.
-- Runs in a transaction so the fixtures don't leak into the other test files.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email, created_at, last_sign_in_at) values
  ('00000000-0000-0000-0000-0000000e1001', 'new@test.dev', now(), now()),
  ('00000000-0000-0000-0000-0000000e1002', 'old@test.dev', now() - interval '60 days', now() - interval '20 days'),
  ('00000000-0000-0000-0000-0000000e1003', 'buyer@test.dev', now() - interval '30 days', now()),
  ('00000000-0000-0000-0000-0000000e1004', 'idle@test.dev', now() - interval '60 days', now() - interval '20 days');
insert into public.courses (id, title, description, level, category, price, published) values
  ('ep-a', 'Foundations', 'd', 'Beginner', 'Foundations', 0, true),
  ('ep-b', 'Moves', 'd', 'Beginner', 'Foundations', 0, true);
update public.courses set requires_course_id = 'ep-a' where id = 'ep-b';
insert into public.lessons (id, course_id, title, position, published, kind) values
  ('e9000000-0000-0000-0000-000000000001', 'ep-a', 'One', 1, true, 'video'),
  ('e9000000-0000-0000-0000-000000000002', 'ep-a', 'Two', 2, true, 'video');
insert into public.enrollments (user_id, course_id, source, enrolled_at, access_level) values
  ('00000000-0000-0000-0000-0000000e1002', 'ep-a', 'grant', now() - interval '40 days', 'full'),
  ('00000000-0000-0000-0000-0000000e1003', 'ep-a', 'grant', now() - interval '1 hour', 'full');
insert into public.lesson_progress (user_id, lesson_id, completed_at, updated_at) values
  ('00000000-0000-0000-0000-0000000e1003', 'e9000000-0000-0000-0000-000000000001', now(), now()),
  ('00000000-0000-0000-0000-0000000e1002', 'e9000000-0000-0000-0000-000000000001', now() - interval '3 days', now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000e1002', 'e9000000-0000-0000-0000-000000000002', now(), now());
insert into public.practice_sessions (user_id, practiced_on) values ('00000000-0000-0000-0000-0000000e1002', current_date - 10), ('00000000-0000-0000-0000-0000000e1004', current_date - 10);
insert into public.offers (id, slug, title, payment_type, price_cents, currency, status)
values ('e8000000-0000-0000-0000-000000000001', 'ep-moves', 'Moves', 'one_time', 12900, 'USD', 'published');
insert into public.orders (id, user_id, offer_id, status, amount_cents, currency, provider, created_at) values
  ('e7000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000e1003', 'e8000000-0000-0000-0000-000000000001', 'pending', 12900, 'USD', 'test', now() - interval '3 hours'),
  ('e7000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000e1003', 'e8000000-0000-0000-0000-000000000001', 'canceled', 12900, 'USD', 'test', now() - interval '4 hours');
insert into public.quiz_leads (first_name, email, tier, scores, answers) values ('Lea', 'lead@test.dev', 'foundations', '{}', '{}'), ('Old', 'old@test.dev', 'foundations', '{}', '{}');

set role service_role;
select t.ok((select 'new@test.dev' = any(array_agg(email)) and not 'old@test.dev' = any(array_agg(email)) from public.flow_trigger_candidates('signed_up', '{}', now() - interval '1 day')),
            'signed up: only accounts created since the flow went live');
select t.ok((select count(*) from public.flow_trigger_candidates('chapter_purchased', '{"courseId": "ep-a"}', now() - interval '1 day')) = 1,
            'bought a chapter: recent enrollments in that chapter');
select t.ok((select context->>'targetCourseId' from public.flow_trigger_candidates('chapter_progress', '{"percent": 50}', now() - interval '1 day')) = 'ep-b',
            'chapter progress at 50% carries the next chapter to sell');
select t.ok((select count(*) from public.flow_trigger_candidates('chapter_progress', '{"percent": 80}', now() - interval '1 day') where email = 'buyer@test.dev') = 0,
            'below the threshold nobody enters');
select t.ok((select count(*) from public.flow_trigger_candidates('chapter_progress', '{"percent": 50}', now() - interval '1 day') where email = 'old@test.dev') = 0,
            'someone already past the threshold before go-live does not enter when they finish another lesson');
select t.ok((select count(*) from public.flow_trigger_candidates('chapter_completed', '{}', now() - interval '1 day') where email = 'old@test.dev') = 1,
            'finishing the chapter after go-live enters');
select t.ok((select count(*) from public.flow_trigger_candidates('chapter_started', '{}', now() - interval '1 day') where email = 'old@test.dev') = 0,
            'a chapter started before go-live is not a new start');
select t.ok((select dedupe_key from public.flow_trigger_candidates('inactive_practice', '{"days": 7}', now() - interval '30 days') where email = 'old@test.dev') = (current_date - 10)::text,
            'no practice for 7 days: keyed by the last practice day, so a new lapse enters again');
select t.ok((select 'idle@test.dev' = any(array_agg(email)) and not 'old@test.dev' = any(array_agg(email)) and not 'buyer@test.dev' = any(array_agg(email)) from public.flow_trigger_candidates('inactive_app', '{"days": 7}', now() - interval '30 days')),
            'not seen in the app for 7 days (watching a lesson today counts as seen)');
select t.ok((select not 'idle@test.dev' = any(coalesce(array_agg(email), '{}')) from public.flow_trigger_candidates('inactive_app', '{"days": 14}', now() - interval '30 days')),
            'practicing counts as being seen, not only signing in');
select t.ok((select context->>'orderId' from public.flow_trigger_candidates('checkout_abandoned', '{"hours": 2}', now() - interval '1 day')) = 'e7000000-0000-0000-0000-000000000001',
            'abandoned checkout: one entry per offer and day, the latest unpaid order');
select t.ok((select count(*) from public.flow_trigger_candidates('checkout_abandoned', '{"hours": 5}', now() - interval '1 day')) = 0,
            'an order younger than the wait is not abandoned yet');
select t.ok((select 'lead@test.dev' = any(array_agg(email)) and not 'old@test.dev' = any(array_agg(email)) from public.flow_trigger_candidates('quiz_lead', '{}', now() - interval '1 day')),
            'quiz leads without an account (members are skipped)');

-- Campaign audiences, minus unsubscribed addresses.
select t.ok((select count(*) from public.campaign_audience('{"kind": "all_members"}')) >= 3, 'all members');
select t.ok((select array_agg(email order by email) from public.campaign_audience('{"kind": "owns_chapter", "courseId": "ep-a"}')) = array['buyer@test.dev', 'old@test.dev'],
            'owners of a chapter');
select t.ok((select 'lead@test.dev' = any(array_agg(email)) and not 'old@test.dev' = any(array_agg(email)) from public.campaign_audience('{"kind": "quiz_leads"}')), 'quiz leads only (members excluded)');
select t.ok(public.campaign_audience_size('{"kind": "owns_chapter", "courseId": "ep-a"}') = 2, 'audience size counts in the database');
reset role;

-- Flows enrol a page at a time, skipping people already in the flow.
insert into public.email_flows (id, name, trigger, status, live_since) values ('e6000000-0000-0000-0000-000000000001', 'Welcome', 'signed_up', 'live', now() - interval '1 day');
set role service_role;
select t.ok((select 'new@test.dev' = any(array_agg(email)) from public.flow_new_candidates('e6000000-0000-0000-0000-000000000001', 500)), 'new sign-ups are candidates');
reset role;
insert into public.email_flow_runs (flow_id, user_id, node_id) values ('e6000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000e1001', 't');
set role service_role;
select t.ok((select count(*) from public.flow_new_candidates('e6000000-0000-0000-0000-000000000001', 500) where email = 'new@test.dev') = 0, 'someone already in the flow is not a candidate again');
reset role;

-- A campaign queues every recipient once, however often it is started.
insert into public.email_campaigns (id, name, status, audience, email) values
  ('e5000000-0000-0000-0000-000000000001', 'News', 'sending', '{"kind": "owns_chapter", "courseId": "ep-a"}', '{"subject": "Hi", "preheader": "", "blocks": []}');
set role service_role;
select t.ok(public.enqueue_campaign('e5000000-0000-0000-0000-000000000001') = 2, 'a campaign queues one message per recipient');
select t.ok(public.enqueue_campaign('e5000000-0000-0000-0000-000000000001') = 0, 'queueing again adds nobody');
reset role;

-- A hard bounce stops future mail to that address.
insert into public.email_messages (user_id, to_email, subject, provider_id) values ('00000000-0000-0000-0000-0000000e1003', 'buyer@test.dev', 'Hi', 're_bounce_1');
set role service_role;
select public.record_email_event('re_bounce_1', 'email.bounced', now());
select t.ok(public.is_unsubscribed('00000000-0000-0000-0000-0000000e1003', 'buyer@test.dev'), 'a hard bounce unsubscribes the address');
reset role;
delete from public.email_unsubscribes where user_id = '00000000-0000-0000-0000-0000000e1003';

insert into public.email_unsubscribes (email, source) values ('LEAD@test.dev', 'link');
set role service_role;
select t.ok((select count(*) from public.campaign_audience('{"kind": "quiz_leads"}') where email = 'lead@test.dev') = 0, 'an unsubscribed address is left out (any letter case)');
select t.ok(public.is_unsubscribed(null, 'lead@test.dev') and not public.is_unsubscribed('00000000-0000-0000-0000-0000000e1003', 'buyer@test.dev'),
            'is_unsubscribed checks the member and the address');
reset role;

set role authenticated;
select t.login('00000000-0000-0000-0000-0000000e1003');
select t.fails_with($$select * from public.campaign_audience('{"kind": "everyone"}')$$, '42501', 'members cannot list an audience');
select t.fails_with($$select * from public.flow_trigger_candidates('signed_up', '{}', now())$$, '42501', 'members cannot list trigger candidates');
select t.fails_with($$select public.enqueue_campaign('e5000000-0000-0000-0000-000000000001')$$, '42501', 'members cannot start a campaign');
select t.fails_with($$select * from public.flow_new_candidates('e6000000-0000-0000-0000-000000000001', 10)$$, '42501', 'members cannot list flow candidates');
select t.ok((select count(*) from public.email_campaigns) = 0, 'campaigns are server-only');
reset role;

rollback;
