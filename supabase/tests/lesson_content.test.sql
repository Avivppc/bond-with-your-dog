-- Stage A3: lesson content — private video references, downloadable files, rich body.
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'learner@test.dev'),
  ('00000000-0000-0000-0000-0000000000d2', 'outsider@test.dev');

insert into public.courses (id, title, description, level, category, price, published)
  values ('lc-course', 'Content course', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.modules (id, course_id, title, position, published)
  values ('c0000000-0000-0000-0000-000000000001', 'lc-course', 'M', 1, true);
insert into public.lessons (id, course_id, module_id, position, title, body_html)
  values ('d0000000-0000-0000-0000-000000000001', 'lc-course', 'c0000000-0000-0000-0000-000000000001', 1, 'L',
          '<p>Hello</p>');
insert into public.lesson_videos (lesson_id, provider, external_id, external_hash)
  values ('d0000000-0000-0000-0000-000000000001', 'vimeo', '123456789', 'abcdef');
insert into public.lesson_files (lesson_id, file_name, storage_path, size_bytes, content_type)
  values ('d0000000-0000-0000-0000-000000000001', 'guide.pdf', 'lc-course/guide.pdf', 1024, 'application/pdf');
insert into public.enrollments (user_id, course_id, source)
  values ('00000000-0000-0000-0000-0000000000d1', 'lc-course', 'grant');

select t.fails_with($$insert into public.lesson_videos (lesson_id, provider, external_id)
                      values ('d0000000-0000-0000-0000-000000000001', 'youtube', 'x')$$,
                    '23514', 'only vimeo/mux providers');

set role authenticated;

-- Enrolled learner: sees body and file metadata, never the video reference.
select t.login('00000000-0000-0000-0000-0000000000d1');
select t.denied($$select body_html from public.lessons$$,
                'lesson body is server-only (loaded after can_access_lesson)');
select t.ok((select count(*) from public.lesson_files) = 1, 'enrolled learner sees file metadata');
select t.denied($$select external_id from public.lesson_videos$$, 'video references are server-only');
select t.denied($$insert into public.lesson_files (lesson_id, file_name, storage_path)
                  values ('d0000000-0000-0000-0000-000000000001', 'x', 'x')$$, 'clients cannot add files');

-- Outsider: no access to the lesson → no file metadata.
select t.login('00000000-0000-0000-0000-0000000000d2');
select t.ok((select count(*) from public.lesson_files) = 0, 'files follow lesson access');

reset role;

-- Events are append-only, even for privileged roles.
insert into public.events (type) values ('test.event');
select t.fails_with($$update public.events set type = 'tampered'$$, 'P0001', 'events cannot be updated');
select t.fails_with($$delete from public.events$$, 'P0001', 'events cannot be deleted');

-- The old public Mux columns are gone from lessons (moved to lesson_videos).
select t.ok(not exists (select 1 from information_schema.columns
                        where table_schema = 'public' and table_name = 'lessons' and column_name = 'mux_playback_id'),
            'lessons no longer expose mux_playback_id');
