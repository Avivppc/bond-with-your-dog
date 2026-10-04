-- A video lesson completes only after most of it was played; seeking or one big report doesn't count.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000e7e1', 'watcher@test.dev', '{"full_name":"Watcher"}');
insert into public.courses (id, title, description, level, category, price, published) values
  ('w-free', 'Watch course', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.lessons (id, course_id, position, title, kind) values
  ('e7000000-0000-0000-0000-000000000001', 'w-free', 1, 'With video', 'video'),
  ('e7000000-0000-0000-0000-000000000002', 'w-free', 2, 'Text only', 'video'),
  ('e7000000-0000-0000-0000-000000000003', 'w-free', 3, 'Unknown length', 'video');
insert into public.lesson_videos (lesson_id, provider, external_id, duration_seconds) values
  ('e7000000-0000-0000-0000-000000000001', 'vimeo', '1', 100),
  ('e7000000-0000-0000-0000-000000000003', 'vimeo', '3', null);

set role authenticated;
select t.login('00000000-0000-0000-0000-00000000e7e1');
select public.enroll_free('w-free');

-- Not watched: refused, with a hint the app can recognise.
select t.fails_with($$select public.complete_lesson('e7000000-0000-0000-0000-000000000001')$$, 'P0001', 'an unwatched video lesson cannot be completed');

-- Jumping to the end moves the resume point but adds no played time.
select public.record_lesson_progress('e7000000-0000-0000-0000-000000000001', 95, 0);
select t.fails_with($$select public.complete_lesson('e7000000-0000-0000-0000-000000000001')$$, 'P0001', 'seeking to the end is not watching');

-- Reporting it all at once, or in many quick calls, is capped by the time since watching began.
select public.record_lesson_progress('e7000000-0000-0000-0000-000000000001', 95, 500);
select public.record_lesson_progress('e7000000-0000-0000-0000-000000000001', 95, 10) from generate_series(1, 20);
select t.ok((select played_seconds <= 30 from public.lesson_progress where lesson_id = 'e7000000-0000-0000-0000-000000000001'),
            'played time is capped by real time, however it is split');
select t.fails_with($$select public.complete_lesson('e7000000-0000-0000-0000-000000000001')$$, 'P0001', 'quick repeated reports do not count as watching');

-- Twenty seconds after starting: still capped (70 s at most), not enough for 80 of 100 s.
reset role;
update public.lesson_progress set played_since = now() - interval '20 seconds' where lesson_id = 'e7000000-0000-0000-0000-000000000001';
set role authenticated;
select public.record_lesson_progress('e7000000-0000-0000-0000-000000000001', 95, 60);
select t.ok((select played_seconds = 70 from public.lesson_progress where lesson_id = 'e7000000-0000-0000-0000-000000000001'), 'the cap grows with real time');
select t.fails_with($$select public.complete_lesson('e7000000-0000-0000-0000-000000000001')$$, 'P0001', 'under 80% played is not enough');

-- A minute and a half after starting, a real viewer's reports go through in full.
reset role;
update public.lesson_progress set played_since = now() - interval '90 seconds' where lesson_id = 'e7000000-0000-0000-0000-000000000001';
set role authenticated;
select public.record_lesson_progress('e7000000-0000-0000-0000-000000000001', 100, 20);
select public.complete_lesson('e7000000-0000-0000-0000-000000000001');
select t.ok((select completed_at is not null and watch_seconds = 100 and played_seconds = 90 from public.lesson_progress
              where lesson_id = 'e7000000-0000-0000-0000-000000000001'), 'watching 80% completes the lesson');

-- Lessons without a video, or without a known length, complete as before.
select public.complete_lesson('e7000000-0000-0000-0000-000000000002');
select public.complete_lesson('e7000000-0000-0000-0000-000000000003');
select t.ok((select count(*) = 2 from public.lesson_progress
              where lesson_id in ('e7000000-0000-0000-0000-000000000002', 'e7000000-0000-0000-0000-000000000003') and completed_at is not null),
            'no video or unknown length: completes without watching');

-- Played time can't go negative.
select public.record_lesson_progress('e7000000-0000-0000-0000-000000000002', 0, -50);
select t.ok((select played_seconds = 0 from public.lesson_progress where lesson_id = 'e7000000-0000-0000-0000-000000000002'), 'negative reports are ignored');
reset role;

select t.ok(not has_function_privilege('anon', 'public.record_lesson_progress(uuid,integer,integer)', 'execute'), 'anon cannot record progress');

rollback;
