-- Scheduled reminders: profiles.timezone, the delivery log and the service-role helpers.
-- Runs in a transaction so the fixtures don't leak into the other test files.
\set ON_ERROR_STOP 1
begin;
-- The job runs as service_role; let it use the assertion helpers (rolled back with the rest).
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000a7e0001', 'rem-member@test.dev', '{"full_name": "Dana Levi"}'),
  ('00000000-0000-0000-0000-00000a7e0002', 'rem-expired@test.dev', '{}'),
  ('00000000-0000-0000-0000-00000a7e0003', 'rem-nocourse@test.dev', '{}'),
  ('00000000-0000-0000-0000-00000a7e0004', 'rem-limited@test.dev', '{}');
insert into public.courses (id, title, description, level, category, price, published) values
  ('rem-course', 'Foundations', 'd', 'Beginner', 'Foundations', 0, true),
  ('rem-next', 'Moves', 'd', 'Beginner', 'Foundations', 0, true);
update public.courses set requires_course_id = 'rem-course' where id = 'rem-next';
insert into public.lessons (id, course_id, title, position, published, kind, available_after_days) values
  ('e1000000-0000-0000-0000-000000000001', 'rem-course', 'Day one', 1, true, 'video', null),
  ('e1000000-0000-0000-0000-000000000002', 'rem-course', 'Opens on day three', 2, true, 'video', 3),
  ('e1000000-0000-0000-0000-000000000003', 'rem-course', 'Draft lesson', 3, false, 'video', 3),
  ('e1000000-0000-0000-0000-000000000004', 'rem-course', 'Opens on day thirty', 4, true, 'video', 30),
  ('e1000000-0000-0000-0000-000000000005', 'rem-next', 'Next chapter lesson', 1, true, 'video', 3);
insert into public.enrollments (user_id, course_id, source, enrolled_at, expires_at) values
  ('00000000-0000-0000-0000-00000a7e0001', 'rem-course', 'grant', now() - interval '3 days 2 hours', null),
  ('00000000-0000-0000-0000-00000a7e0001', 'rem-next', 'grant', now() - interval '3 days 2 hours', null),
  ('00000000-0000-0000-0000-00000a7e0002', 'rem-course', 'grant', now() - interval '3 days 2 hours', now() - interval '1 hour');
insert into public.practice_sessions (user_id, practiced_on) values
  ('00000000-0000-0000-0000-00000a7e0001', current_date),
  ('00000000-0000-0000-0000-00000a7e0001', current_date - 10);

-- ── profiles.timezone: members set their own; the shape is checked ──
select t.login('00000000-0000-0000-0000-00000a7e0001');
set role authenticated;
update public.profiles set timezone = 'America/Argentina/Buenos_Aires' where id = '00000000-0000-0000-0000-00000a7e0001';
select t.ok((select timezone from public.profiles where id = '00000000-0000-0000-0000-00000a7e0001') = 'America/Argentina/Buenos_Aires',
            'members save their own time zone');
select t.fails_with($$update public.profiles set timezone = '../../etc/passwd' where id = '00000000-0000-0000-0000-00000a7e0001'$$,
                    '23514', 'time zones that are not IANA-shaped are rejected');
select t.fails_with($$update public.profiles set timezone = '' where id = '00000000-0000-0000-0000-00000a7e0001'$$,
                    '23514', 'an empty time zone is rejected (null means unknown)');
update public.profiles set timezone = 'Asia/Jerusalem' where id = '00000000-0000-0000-0000-00000a7e0001';

-- ── Members cannot see or touch the job's data ──
select t.denied($$select * from public.reminder_deliveries$$, 'members cannot read the delivery log');
select t.denied($$insert into public.reminder_deliveries (user_id, kind, ref) values ('00000000-0000-0000-0000-00000a7e0001', 'practice', 'x')$$,
                'members cannot write the delivery log');
select t.denied($$select public.deliver_reminder('00000000-0000-0000-0000-00000a7e0001', 'practice', 'x', 'system', 't', null, '/plan')$$,
                'members cannot send reminders');
select t.denied($$select * from public.reminder_members(null, 10)$$, 'members cannot list other members');
select t.denied($$select * from public.reminder_lesson_unlocks(now() - interval '1 day', now())$$, 'members cannot list unlocks');
reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
select t.denied($$select * from public.reminder_members(null, 10)$$, 'signed-out visitors cannot list members');
select t.denied($$select public.deliver_reminder(null, 'practice', 'x', 'system', null, null, null)$$, 'signed-out visitors cannot send');
reset role;

-- ── deliver_reminder: claims once, notifies once ──
set role service_role;
select t.ok(public.deliver_reminder('00000000-0000-0000-0000-00000a7e0001', 'practice', '2026-10-01', 'system',
                                    'Today is a practice day', '10 minutes with your dog', '/plan'),
            'the first delivery is claimed');
select t.ok(not public.deliver_reminder('00000000-0000-0000-0000-00000a7e0001', 'practice', '2026-10-01', 'system',
                                        'Today is a practice day', '10 minutes with your dog', '/plan'),
            'the same delivery is never claimed twice');
select t.ok((select count(*) from public.notifications
              where user_id = '00000000-0000-0000-0000-00000a7e0001' and title = 'Today is a practice day') = 1,
            'a repeated run writes one notification');
select t.ok(public.deliver_reminder('00000000-0000-0000-0000-00000a7e0001', 'practice', '2026-10-03', 'system', 'Another day', null, '/plan'),
            'another date is another delivery');
select t.ok(public.deliver_reminder(null, 'feedback_overdue_email', 'e9000000-0000-0000-0000-000000000001', 'system', null, null, null),
            'team inbox deliveries are claimed');
select t.ok(not public.deliver_reminder(null, 'feedback_overdue_email', 'e9000000-0000-0000-0000-000000000001', 'system', null, null, null),
            'team inbox deliveries are claimed once (null user ids are not distinct)');
select t.ok(public.deliver_reminder('00000000-0000-0000-0000-00000a7e0001', 'lesson_unlocked', 'silent', 'lesson', null, null, null),
            'a claim without a title is allowed');
select t.ok(not exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000a7e0001' and kind = 'lesson'),
            'a claim without a title writes no notification');
select t.fails_with($$select public.deliver_reminder('00000000-0000-0000-0000-00000a7e0001', 'spam', 'x', 'system', 't', null, null)$$,
                    '23514', 'unknown reminder kinds are rejected');
select t.fails_with($$select public.deliver_reminder('00000000-0000-0000-0000-00000a7e0001', 'qa_day_of', 'x', 'system', 't', null, 'https://evil.example')$$,
                    '23514', 'notification links must stay on the site');
select t.ok(not exists (select 1 from public.reminder_deliveries where kind = 'qa_day_of' and ref = 'x'),
            'a failed notification rolls the claim back');

-- ── reminder_members: active members with zone, days, prefs and recent practice ──
select t.ok((select count(*) from public.reminder_members(null, 1000) m
              where m.user_id::text like '00000000-0000-0000-0000-00000a7e000%') = 1,
            'only members with an active course or grant are listed');
select t.ok((select m.first_name = 'Dana' and m.timezone = 'Asia/Jerusalem' and m.email = 'rem-member@test.dev'
                    and m.practice_days = '{1,3,6}'::smallint[] and m.has_courses and m.in_community
                    and m.practiced_on = array[current_date]
               from public.reminder_members(null, 1000) m where m.user_id = '00000000-0000-0000-0000-00000a7e0001'),
            'a member row carries what the job needs, with only recent practice dates');
insert into public.community_grants (user_id, source) values ('00000000-0000-0000-0000-00000a7e0003', 'grant');
select t.ok((select not m.has_courses and m.in_community
               from public.reminder_members(null, 1000) m where m.user_id = '00000000-0000-0000-0000-00000a7e0003'),
            'a community grant alone lists the member for Q&A reminders');
select t.ok(not exists (select 1 from public.reminder_members('00000000-0000-0000-0000-00000a7e0001', 1000) m
                         where m.user_id = '00000000-0000-0000-0000-00000a7e0001'),
            'pages continue after the given id');
select t.ok((select count(*) from public.reminder_members(null, 1)) = 1, 'the page size is respected');

-- ── reminder_lesson_unlocks: drip lessons that opened in the window ──
select t.ok((select array_agg(u.lesson_id order by u.lesson_id) from public.reminder_lesson_unlocks(now() - interval '1 day', now()) u
              where u.user_id::text like '00000000-0000-0000-0000-00000a7e000%')
            = array['e1000000-0000-0000-0000-000000000002'::uuid],
            'only the published, delayed lesson of an open chapter is listed (not drafts, not expired enrollments)');
select t.ok(not exists (select 1 from public.reminder_lesson_unlocks(now() - interval '1 hour', now()) u
                         where u.user_id::text like '00000000-0000-0000-0000-00000a7e000%'),
            'lessons that opened before the window are not listed again');
select t.ok(not exists (select 1 from public.reminder_lesson_unlocks(now() - interval '1 day', now() + interval '40 days') u
                         where u.lesson_id = 'e1000000-0000-0000-0000-000000000004'),
            'future unlocks are never listed, whatever the window says');
insert into public.lesson_progress (user_id, lesson_id, completed_at)
select '00000000-0000-0000-0000-00000a7e0001', id, now() from public.lessons where course_id = 'rem-course' and published;
select t.ok(exists (select 1 from public.reminder_lesson_unlocks(now() - interval '1 day', now()) u
                     where u.lesson_id = 'e1000000-0000-0000-0000-000000000005'
                       and u.user_id = '00000000-0000-0000-0000-00000a7e0001' and u.course_title = 'Moves'),
            'a chapter that requires another one counts once that one is complete');
reset role;

rollback;
