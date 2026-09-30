-- admin_course_stats: per-course counts for the admin course list (active students, lessons, modules).
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000c5a1', 'stats-active@test.dev'),
  ('00000000-0000-0000-0000-00000000c5a2', 'stats-expired@test.dev');

insert into public.courses (id, title, description, level, category, price, published) values
  ('stats-course', 'Stats course', 'd', 'Beginner', 'Foundations', 0, true),
  ('stats-empty', 'Empty course', 'd', 'Beginner', 'Foundations', 0, false);
insert into public.modules (id, course_id, title, position, published) values
  ('c5100000-0000-0000-0000-000000000001', 'stats-course', 'M1', 1, true),
  ('c5100000-0000-0000-0000-000000000002', 'stats-course', 'M2', 2, false);
insert into public.lessons (id, course_id, module_id, position, title) values
  ('c5200000-0000-0000-0000-000000000001', 'stats-course', 'c5100000-0000-0000-0000-000000000001', 1, 'L1'),
  ('c5200000-0000-0000-0000-000000000002', 'stats-course', 'c5100000-0000-0000-0000-000000000002', 1, 'L2');
insert into public.enrollments (user_id, course_id, source, expires_at) values
  ('00000000-0000-0000-0000-00000000c5a1', 'stats-course', 'grant', null),
  ('00000000-0000-0000-0000-00000000c5a2', 'stats-course', 'grant', now() - interval '1 day');

select t.ok((select active_students from public.admin_course_stats() where course_id = 'stats-course') = 1,
            'only unexpired enrollments count as students');
select t.ok((select lessons from public.admin_course_stats() where course_id = 'stats-course') = 2,
            'lessons are counted, drafts included (admin view)');
select t.ok((select modules from public.admin_course_stats() where course_id = 'stats-course') = 2,
            'modules are counted');
select t.ok((select active_students + lessons + modules from public.admin_course_stats() where course_id = 'stats-empty') = 0,
            'courses without content still appear with zeros');
select t.ok(not has_function_privilege('authenticated', 'public.admin_course_stats()', 'execute'),
            'course stats are admin-only');
