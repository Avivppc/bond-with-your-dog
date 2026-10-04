-- Engagement per lesson: viewers, completions, average share played, and where non-finishers stop.
-- The team's own progress doesn't count, and only the server can read it.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00e0e0e0e001', 'eng1@test.dev'),
  ('00000000-0000-0000-0000-00e0e0e0e002', 'eng2@test.dev'),
  ('00000000-0000-0000-0000-00e0e0e0e003', 'eng3@test.dev'),
  ('00000000-0000-0000-0000-00e0e0e0e004', 'eng-staff@test.dev');
insert into public.staff_members (user_id, role) values ('00000000-0000-0000-0000-00e0e0e0e004', 'editor');
insert into public.courses (id, title, description, level, category) values ('eng-course', 'Engagement', 'd', 'Beginner', 'Foundations');
insert into public.lessons (id, course_id, position, title) values
  ('e0000000-0000-0000-0000-00000000e001', 'eng-course', 1, 'Video lesson'),
  ('e0000000-0000-0000-0000-00000000e002', 'eng-course', 2, 'Nobody yet');
insert into public.lesson_videos (lesson_id, provider, external_id, duration_seconds) values
  ('e0000000-0000-0000-0000-00000000e001', 'vimeo', '1', 200);
insert into public.lesson_progress (user_id, lesson_id, watch_seconds, played_seconds, completed_at) values
  ('00000000-0000-0000-0000-00e0e0e0e001', 'e0000000-0000-0000-0000-00000000e001', 200, 200, now()),
  ('00000000-0000-0000-0000-00e0e0e0e002', 'e0000000-0000-0000-0000-00000000e001', 60, 50, null),
  ('00000000-0000-0000-0000-00e0e0e0e003', 'e0000000-0000-0000-0000-00000000e001', 100, 90, null),
  ('00000000-0000-0000-0000-00e0e0e0e004', 'e0000000-0000-0000-0000-00000000e001', 10, 10, null);

create temp table eng as select * from public.admin_lesson_engagement('eng-course');
select t.ok((select viewers = 3 and completed = 1 and video_seconds = 200 from eng where lesson_id = 'e0000000-0000-0000-0000-00000000e001'),
            'counts students who opened and finished it, not the team');
-- (100% + 25% + 45%) / 3 = 56.7%
select t.ok((select avg_watched_pct = 56.7 from eng where lesson_id = 'e0000000-0000-0000-0000-00000000e001'), 'average share of the video played');
select t.ok((select median_stop_seconds = 80 from eng where lesson_id = 'e0000000-0000-0000-0000-00000000e001'), 'where students who did not finish stopped');
select t.ok((select viewers = 0 and avg_watched_pct is null and median_stop_seconds is null from eng where lesson_id = 'e0000000-0000-0000-0000-00000000e002'),
            'a lesson nobody opened shows zeros');

set role authenticated;
select t.denied($$select * from public.admin_lesson_engagement('eng-course')$$, 'members cannot read it');
reset role;

rollback;
