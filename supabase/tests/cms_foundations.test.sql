-- Stage A1: CMS foundations — staff roles, modules (2 levels), draft/published.
-- Runs after phase0_access.test.sql in the same throwaway DB; helpers in schema t.
\set ON_ERROR_STOP 1

-- ── fixtures (as superuser) ─────────────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@test.dev'),
  ('00000000-0000-0000-0000-0000000000e2', 'editor@test.dev'),
  ('00000000-0000-0000-0000-0000000000e3', 'student@test.dev');

insert into public.staff_members (user_id, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner'),
  ('00000000-0000-0000-0000-0000000000e2', 'editor');

insert into public.courses (id, title, description, level, category, price, published) values
  ('cms-live',  'Live course',  'd', 'Beginner', 'Foundations', 0, true),
  ('cms-draft', 'Draft course', 'd', 'Beginner', 'Foundations', 0, false);

insert into public.modules (id, course_id, parent_id, title, position, published) values
  ('a0000000-0000-0000-0000-000000000001', 'cms-live', null, 'Module 1 (live)',  1, true),
  ('a0000000-0000-0000-0000-000000000002', 'cms-live', 'a0000000-0000-0000-0000-000000000001', 'Sub 1.1 (live)', 1, true),
  ('a0000000-0000-0000-0000-000000000003', 'cms-live', null, 'Module 2 (draft)', 2, false);

insert into public.lessons (id, course_id, module_id, position, title, published) values
  ('b0000000-0000-0000-0000-000000000001', 'cms-live', 'a0000000-0000-0000-0000-000000000002', 1, 'Live lesson',             true),
  ('b0000000-0000-0000-0000-000000000002', 'cms-live', 'a0000000-0000-0000-0000-000000000002', 2, 'Draft lesson',            false),
  ('b0000000-0000-0000-0000-000000000003', 'cms-live', 'a0000000-0000-0000-0000-000000000003', 1, 'Lesson in draft module',  true),
  ('b0000000-0000-0000-0000-000000000004', 'cms-live', 'a0000000-0000-0000-0000-000000000002', 3, 'Another live lesson',     true);

insert into public.enrollments (user_id, course_id, source)
  values ('00000000-0000-0000-0000-0000000000e3', 'cms-live', 'grant');

-- ── Structure rules ────────────────────────────────────────
select t.fails_with($$insert into public.modules (course_id, parent_id, title, position)
                      values ('cms-live', 'a0000000-0000-0000-0000-000000000002', 'Too deep', 1)$$,
                    '23514', 'modules nest at most two levels');
select t.fails_with($$insert into public.modules (course_id, parent_id, title, position)
                      values ('cms-draft', 'a0000000-0000-0000-0000-000000000001', 'Wrong course', 1)$$,
                    '23514', 'a submodule belongs to its parent''s course');
select t.fails_with($$update public.lessons set module_id = 'a0000000-0000-0000-0000-000000000001', course_id = 'cms-draft'
                      where id = 'b0000000-0000-0000-0000-000000000001'$$,
                    '23514', 'a lesson belongs to its module''s course');
select t.fails_with($$delete from public.modules where id = 'a0000000-0000-0000-0000-000000000002'$$,
                    '23503', 'a module with lessons cannot be deleted (no silent content loss)');

-- ── Reorder (service role only) ────────────────────────────
select public.reorder_lessons('a0000000-0000-0000-0000-000000000002',
  array['b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002']::uuid[]);
select t.ok((select array_agg(title order by position) from public.lessons
             where module_id = 'a0000000-0000-0000-0000-000000000002')
            = array['Another live lesson', 'Live lesson', 'Draft lesson'], 'reorder_lessons applies the given order');
select t.fails_with($$select public.reorder_lessons('a0000000-0000-0000-0000-000000000002',
  array['b0000000-0000-0000-0000-000000000003']::uuid[])$$, '22023', 'reorder rejects lessons from another module');
select public.reorder_modules('cms-live', null,
  array['a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001']::uuid[]);
select t.ok((select position from public.modules where id = 'a0000000-0000-0000-0000-000000000003') = 1,
            'reorder_modules applies the given order');
select t.ok(not has_function_privilege('authenticated', 'public.reorder_lessons(uuid,uuid[])', 'execute'),
            'clients cannot reorder');

-- ── Default-module backfill for legacy flat lessons ────────
insert into public.courses (id, title, description, level, category, price, published)
  values ('cms-flat', 'Flat course', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.lessons (course_id, position, title) values ('cms-flat', 1, 'Flat A'), ('cms-flat', 2, 'Flat B');
select private.backfill_default_modules();
select t.ok((select count(*) from public.modules where course_id = 'cms-flat') = 1, 'backfill creates one module per flat course');
select t.ok((select count(*) from public.lessons where course_id = 'cms-flat' and module_id is null) = 0,
            'backfill moves every flat lesson into it');

-- ── As the student ─────────────────────────────────────────
set role authenticated;
select t.login('00000000-0000-0000-0000-0000000000e3');

select t.ok(public.current_staff_role() is null, 'students have no staff role');
select t.ok((select count(*) from public.courses where id = 'cms-draft') = 0, 'students cannot see unpublished courses');
select t.ok((select count(*) from public.modules where course_id = 'cms-live') = 2, 'students see only published modules');
select t.ok((select count(*) from public.lessons where course_id = 'cms-live') = 2,
            'students see only published lessons in published modules');
select t.ok(public.can_access_lesson('b0000000-0000-0000-0000-000000000001'), 'published lesson is accessible when enrolled');
select t.ok(not public.can_access_lesson('b0000000-0000-0000-0000-000000000002'), 'draft lesson is not accessible');
select t.ok(not public.can_access_lesson('b0000000-0000-0000-0000-000000000003'), 'lesson inside a draft module is not accessible');
select t.denied($$insert into public.modules (course_id, title, position) values ('cms-live', 'x', 9)$$,
                'students cannot write modules');
select t.denied($$insert into public.staff_members (user_id, role)
                  values ('00000000-0000-0000-0000-0000000000e3', 'owner')$$, 'nobody can self-promote to staff');

-- ── As the editor (the client) ─────────────────────────────
select t.login('00000000-0000-0000-0000-0000000000e2');
select t.ok(public.current_staff_role() = 'editor', 'editor role is visible to the editor');
select t.ok((select count(*) from public.courses where id = 'cms-draft') = 1, 'staff see unpublished courses');
select t.ok((select count(*) from public.modules where course_id = 'cms-live') = 3, 'staff see draft modules');
select t.ok((select count(*) from public.lessons where course_id = 'cms-live') = 4, 'staff see draft lessons');
select t.ok(public.can_access_lesson('b0000000-0000-0000-0000-000000000002'), 'staff can preview draft lessons');
select t.ok((select count(*) from public.staff_members) = 1, 'staff see only their own staff row');

reset role;
