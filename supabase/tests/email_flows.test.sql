-- Email flows: who enters a "next chapter" flow, and that members can't read flow data.
-- Runs in a transaction so the fixtures don't leak into the other test files.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f1001', 'flow-80@test.dev'),
  ('00000000-0000-0000-0000-0000000f1002', 'flow-done@test.dev'),
  ('00000000-0000-0000-0000-0000000f1003', 'flow-half@test.dev'),
  ('00000000-0000-0000-0000-0000000f1004', 'flow-owns-next@test.dev'),
  ('00000000-0000-0000-0000-0000000f1005', 'flow-old@test.dev');
insert into public.courses (id, title, description, level, category, price, published) values
  ('flow-a', 'Foundations', 'd', 'Beginner', 'Foundations', 0, true),
  ('flow-b', 'Moves', 'd', 'Beginner', 'Foundations', 0, true);
update public.courses set requires_course_id = 'flow-a' where id = 'flow-b';
insert into public.lessons (id, course_id, title, position, published, kind)
select ('f2000000-0000-0000-0000-00000000000' || n)::uuid, 'flow-a', 'Lesson ' || n, n, true, 'video' from generate_series(1, 5) n;
insert into public.lessons (id, course_id, title, position, published, kind) values
  ('f2000000-0000-0000-0000-000000000009', 'flow-a', 'Draft', 9, false, 'video');
-- A published lesson inside a hidden module: members don't see it, so it doesn't count either.
insert into public.modules (id, course_id, title, position, published) values ('f3000000-0000-0000-0000-000000000001', 'flow-a', 'Hidden', 9, false);
insert into public.lessons (id, course_id, module_id, title, position, published, kind) values
  ('f2000000-0000-0000-0000-000000000008', 'flow-a', 'f3000000-0000-0000-0000-000000000001', 'In a hidden module', 8, true, 'video');

insert into public.enrollments (user_id, course_id, source)
select u, 'flow-a', 'grant' from unnest(array[
  '00000000-0000-0000-0000-0000000f1001', '00000000-0000-0000-0000-0000000f1002', '00000000-0000-0000-0000-0000000f1003',
  '00000000-0000-0000-0000-0000000f1004', '00000000-0000-0000-0000-0000000f1005']::uuid[]) u;
insert into public.enrollments (user_id, course_id, source, access_level) values
  ('00000000-0000-0000-0000-0000000f1004', 'flow-b', 'grant', 'full');

-- 4 of 5 lessons (80%) / all 5 / 2 of 5 / all 5 but owns Moves / all 5, long ago.
insert into public.lesson_progress (user_id, lesson_id, completed_at)
select '00000000-0000-0000-0000-0000000f1001'::uuid, ('f2000000-0000-0000-0000-00000000000' || n)::uuid, now() from generate_series(1, 4) n
union all select '00000000-0000-0000-0000-0000000f1002'::uuid, ('f2000000-0000-0000-0000-00000000000' || n)::uuid, now() from generate_series(1, 5) n
union all select '00000000-0000-0000-0000-0000000f1003'::uuid, ('f2000000-0000-0000-0000-00000000000' || n)::uuid, now() from generate_series(1, 2) n
union all select '00000000-0000-0000-0000-0000000f1004'::uuid, ('f2000000-0000-0000-0000-00000000000' || n)::uuid, now() from generate_series(1, 5) n
union all select '00000000-0000-0000-0000-0000000f1005'::uuid, ('f2000000-0000-0000-0000-00000000000' || n)::uuid, now() - interval '30 days' from generate_series(1, 5) n;

set role service_role;
select t.ok((select array_agg(user_id order by user_id) from public.flow_candidates('chapter_80', 'flow-a', now() - interval '1 day'))
            = array['00000000-0000-0000-0000-0000000f1001', '00000000-0000-0000-0000-0000000f1002']::uuid[],
            '80%: members at or past 80% since the flow went live, who do not own the next chapter');
select t.ok((select array_agg(user_id) from public.flow_candidates('chapter_completed', null, now() - interval '1 day'))
            = array['00000000-0000-0000-0000-0000000f1002']::uuid[],
            'completed: only members who finished every published lesson');
select t.ok((select target_course_id from public.flow_candidates('chapter_completed', null, now() - interval '1 day') limit 1) = 'flow-b',
            'the flow sells the chapter that requires this one');
select t.ok((select count(*) from public.flow_candidates('chapter_completed', null, now() - interval '60 days')) = 2,
            'an earlier go-live date also reaches members who finished long ago');
reset role;

-- Resend events land on the email: first timestamps kept, counters add up, a click is an open,
-- a spam complaint unsubscribes.
insert into public.email_messages (user_id, to_email, subject, provider_id)
values ('00000000-0000-0000-0000-0000000f1001', 'flow-80@test.dev', 'Hi', 're_test_1');
set role service_role;
select public.record_email_event('re_test_1', 'email.delivered', '2026-10-03 10:00+00');
select public.record_email_event('re_test_1', 'email.clicked', '2026-10-03 11:00+00');
select public.record_email_event('re_test_1', 'email.opened', '2026-10-03 12:00+00');
select public.record_email_event('re_test_1', 'email.opened', '2026-10-03 13:00+00');
select public.record_email_event('re_test_1', 'email.complained', '2026-10-03 14:00+00');
reset role;
select t.ok((select opened_at = '2026-10-03 11:00+00' and clicked_at is not null and open_count = 2 and click_count = 1 and delivered_at is not null
             from public.email_messages where provider_id = 're_test_1'),
            'opens and clicks are counted, and the first open is the click that came before it');
select t.ok(exists (select 1 from public.email_unsubscribes where user_id = '00000000-0000-0000-0000-0000000f1001' and source = 'complaint'),
            'a spam complaint unsubscribes the member');

-- A webhook delivery is applied once: a retry with the same delivery id changes nothing.
insert into public.email_messages (user_id, to_email, subject, provider_id)
values ('00000000-0000-0000-0000-0000000f1002', 'flow-done@test.dev', 'Hi', 're_test_2');
set role service_role;
select t.ok(public.apply_email_webhook('msg_1', 're_test_2', 'email.opened', '{}'::jsonb, now()), 'a new delivery is applied');
select t.ok(not public.apply_email_webhook('msg_1', 're_test_2', 'email.opened', '{}'::jsonb, now()), 'the same delivery again is a duplicate');
reset role;
select t.ok((select open_count from public.email_messages where provider_id = 're_test_2') = 1, 'a retried webhook does not double-count');

-- One email per member per step; failed attempts don't block a retry.
insert into public.email_flows (id, name, trigger) values ('f4000000-0000-0000-0000-000000000001', 'Test flow', 'chapter_80');
insert into public.email_flow_runs (id, flow_id, user_id, course_id, target_course_id, node_id)
values ('f5000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000f1001', 'flow-a', 'flow-b', 't');
insert into public.email_messages (run_id, node_id, to_email, subject, status) values ('f5000000-0000-0000-0000-000000000001', 'e1', 'x@test.dev', 'S', 'failed');
insert into public.email_messages (run_id, node_id, to_email, subject, status) values ('f5000000-0000-0000-0000-000000000001', 'e1', 'x@test.dev', 'S', 'queued');
select t.fails_with($$insert into public.email_messages (run_id, node_id, to_email, subject, status) values ('f5000000-0000-0000-0000-000000000001', 'e1', 'x@test.dev', 'S', 'queued')$$,
                    '23505', 'the same step is never queued twice for a member');

-- One code per member, chapter and flow; and a code sits on one open or paid order.
insert into public.discount_codes (id, code, user_id, course_id, percent, expires_at, flow_id)
values ('f6000000-0000-0000-0000-000000000001', 'BOND-TEST-0001', '00000000-0000-0000-0000-0000000f1001', 'flow-b', 20, now() + interval '7 days', 'f4000000-0000-0000-0000-000000000001');
select t.fails_with($$insert into public.discount_codes (code, user_id, course_id, percent, expires_at, flow_id)
                      values ('BOND-TEST-0002', '00000000-0000-0000-0000-0000000f1001', 'flow-b', 20, now() + interval '7 days', 'f4000000-0000-0000-0000-000000000001')$$,
                    '23505', 'a member gets one code per chapter and flow (no fresh code after expiry)');
insert into public.offers (id, slug, title, payment_type, price_cents, currency, status)
values ('f7000000-0000-0000-0000-000000000001', 'flow-b-test', 'Moves', 'one_time', 12900, 'USD', 'published');
insert into public.orders (user_id, offer_id, status, amount_cents, currency, provider, discount_code_id)
values ('00000000-0000-0000-0000-0000000f1001', 'f7000000-0000-0000-0000-000000000001', 'pending', 10320, 'USD', 'test', 'f6000000-0000-0000-0000-000000000001');
select t.fails_with($$insert into public.orders (user_id, offer_id, status, amount_cents, currency, provider, discount_code_id)
                      values ('00000000-0000-0000-0000-0000000f1001', 'f7000000-0000-0000-0000-000000000001', 'pending', 10320, 'USD', 'test', 'f6000000-0000-0000-0000-000000000001')$$,
                    '23505', 'a code can be on only one open or paid order');

set role authenticated;
select t.login('00000000-0000-0000-0000-0000000f1001');
select t.fails_with($$select public.apply_email_webhook('x', 'y', 'email.opened', '{}'::jsonb, now())$$, '42501', 'members cannot post webhook events');
select t.fails_with($$select public.record_email_event('re_test_1', 'email.opened', now())$$, '42501', 'members cannot fake email events');
select t.ok((select count(*) from public.discount_codes) = 0 and (select count(*) from public.email_flows) = 0,
            'members read no flow data directly (server-only tables)');
select t.fails_with($$select * from public.flow_candidates('chapter_80', null, now())$$, '42501', 'members cannot list flow candidates');
reset role;

rollback;
