-- Duplicating a course: a draft with the same modules, submodules, lessons, videos, quizzes and
-- paywall line, never the students; only the server can do it.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into public.courses (id, title, description, level, category, published, chapter_number) values
  ('dup-src', 'Original', 'd', 'Beginner', 'Foundations', true, 7);
insert into public.modules (id, course_id, title, position, published) values
  ('d1000000-0000-0000-0000-000000000001', 'dup-src', 'Module A', 1, true),
  ('d1000000-0000-0000-0000-000000000002', 'dup-src', 'Module B', 2, true);
insert into public.modules (id, course_id, parent_id, title, position, published) values
  ('d1000000-0000-0000-0000-000000000003', 'dup-src', 'd1000000-0000-0000-0000-000000000001', 'Sub A1', 1, true);
insert into public.lessons (id, course_id, module_id, position, title, kind) values
  ('d2000000-0000-0000-0000-000000000001', 'dup-src', 'd1000000-0000-0000-0000-000000000001', 1, 'Intro', 'video'),
  ('d2000000-0000-0000-0000-000000000002', 'dup-src', 'd1000000-0000-0000-0000-000000000003', 1, 'Deep', 'video'),
  ('d2000000-0000-0000-0000-000000000003', 'dup-src', 'd1000000-0000-0000-0000-000000000002', 1, 'Check', 'quiz');
insert into public.lesson_videos (lesson_id, provider, external_id, duration_seconds) values
  ('d2000000-0000-0000-0000-000000000001', 'vimeo', '111', 90);
insert into public.quiz_questions (lesson_id, position, prompt, kind, options, correct) values
  ('d2000000-0000-0000-0000-000000000003', 1, 'Q?', 'single', '[{"id":"a","text":"A"}]', '["a"]');
update public.courses set paywall_after_module_id = 'd1000000-0000-0000-0000-000000000001' where id = 'dup-src';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000d0d1', 'dup-student@test.dev');
insert into public.enrollments (user_id, course_id, source) values ('00000000-0000-0000-0000-00000000d0d1', 'dup-src', 'grant');

set role service_role;
create temp table pairs as select * from public.admin_duplicate_course('dup-src', 'dup-src-copy', 'Original (copy)');
reset role;

select t.ok((select count(*) = 3 from pairs), 'every lesson is paired with its copy');
select t.ok((select not published and chapter_number is null and title = 'Original (copy)' from public.courses where id = 'dup-src-copy'),
            'the copy is a draft without a chapter number');
select t.ok((select count(*) = 3 from public.modules where course_id = 'dup-src-copy'), 'modules are copied');
select t.ok((select p.title = 'Module A' from public.modules s join public.modules p on p.id = s.parent_id
              where s.course_id = 'dup-src-copy' and s.title = 'Sub A1'), 'submodules sit under the copied parent');
select t.ok((select m.course_id = 'dup-src-copy' and m.title = 'Sub A1' from public.lessons l join public.modules m on m.id = l.module_id
              where l.course_id = 'dup-src-copy' and l.title = 'Deep'), 'lessons sit in the copied modules');
select t.ok((select v.external_id = '111' from public.lesson_videos v join public.lessons l on l.id = v.lesson_id
              where l.course_id = 'dup-src-copy'), 'video references are copied');
select t.ok((select count(*) = 1 from public.quiz_questions q join public.lessons l on l.id = q.lesson_id where l.course_id = 'dup-src-copy'),
            'quiz questions are copied');
select t.ok((select m.title = 'Module A' and m.course_id = 'dup-src-copy' from public.courses c join public.modules m on m.id = c.paywall_after_module_id
              where c.id = 'dup-src-copy'), 'the paywall line points at the copied module');
select t.ok((select count(*) = 0 from public.enrollments where course_id = 'dup-src-copy'), 'students are not copied');
select t.ok((select count(*) = 3 from public.lessons where course_id = 'dup-src'), 'the original is untouched');

set role service_role;
select t.fails_with($$select * from public.admin_duplicate_course('dup-src', 'Bad Id!', 'x')$$, '22023', 'the new id must be a slug');
reset role;
set role authenticated;
select t.denied($$select * from public.admin_duplicate_course('dup-src', 'dup-src-2', 'x')$$, 'members cannot duplicate courses');
reset role;

rollback;
