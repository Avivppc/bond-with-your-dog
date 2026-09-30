-- Phase 0: access rules live in the database, not in the client.
-- Every write that grants value (enrollment, completion, quiz pass, certificate)
-- must go through a SECURITY DEFINER function that checks entitlement.
\set ON_ERROR_STOP 1

-- Helpers (t.ok, t.denied, t.login) come from 01_helpers.sql.

-- ── fixtures (as superuser) ─────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.dev', '{"full_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.dev',   '{"full_name":"Bob"}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@test.dev', '{"full_name":"Carol"}');

insert into public.courses (id, title, description, level, category, price, published) values
  ('t-free', 'Free course', 'd', 'Beginner', 'Foundations', 0, true),
  ('t-paid', 'Paid course', 'd', 'Beginner', 'Foundations', 49, true),
  ('t-cert', 'Cert course', 'd', 'Beginner', 'Foundations', 0, true);

insert into public.lessons (id, course_id, position, title, kind, available_after_days, free_preview) values
  ('10000000-0000-0000-0000-000000000001', 't-free', 1, 'Intro',   'video', null, false),
  ('10000000-0000-0000-0000-000000000002', 't-free', 2, 'Dripped', 'video', 7,    false),
  ('10000000-0000-0000-0000-000000000003', 't-free', 3, 'Quiz',    'quiz',  null, false),
  ('20000000-0000-0000-0000-000000000001', 't-paid', 1, 'Preview', 'video', null, true),
  ('20000000-0000-0000-0000-000000000002', 't-paid', 2, 'Locked',  'video', null, false),
  ('30000000-0000-0000-0000-000000000001', 't-cert', 1, 'One',     'video', null, false),
  ('30000000-0000-0000-0000-000000000002', 't-cert', 2, 'Two',     'video', null, false);

insert into public.quiz_questions (lesson_id, position, prompt, kind, options, correct, explanation) values
  ('10000000-0000-0000-0000-000000000003', 1, 'Q?', 'single', '[{"id":"a","text":"A"}]', '["a"]', 'because');

-- Carol's enrollment in t-free has expired.
insert into public.enrollments (user_id, course_id, source, expires_at)
  values ('00000000-0000-0000-0000-00000000000c', 't-free', 'grant', now() - interval '1 day');

-- ── 0. Function surface: nothing callable by anon except the public lookups ──
select t.ok(not has_function_privilege('anon', 'public.enroll_free(text)', 'execute'), 'anon cannot execute enroll_free');
select t.ok(not has_function_privilege('anon', 'public.complete_lesson(uuid)', 'execute'), 'anon cannot execute complete_lesson');
select t.ok(not has_function_privilege('anon', 'public.record_lesson_progress(uuid,integer)', 'execute'), 'anon cannot execute record_lesson_progress');
select t.ok(has_function_privilege('anon', 'public.verify_certificate(text)', 'execute'), 'anon can verify certificates');
select t.ok(not has_function_privilege('authenticated', 'private.emit_event(text,uuid,text,text,jsonb)', 'execute'), 'clients cannot emit events');

-- ── as Alice (authenticated) ────────────────────────────────
set role authenticated;
select t.login('00000000-0000-0000-0000-00000000000a');

-- 1. No direct enrollment writes.
select t.denied($$insert into public.enrollments (user_id, course_id)
                  values ('00000000-0000-0000-0000-00000000000a', 't-paid')$$,
                'client must not insert enrollments directly');

-- 2. enroll_free refuses paid courses, accepts free ones, and is idempotent.
select t.denied($$select public.enroll_free('t-paid')$$, 'enroll_free must reject a paid course');
select public.enroll_free('t-free');
select public.enroll_free('t-free');
select t.ok((select count(*) from public.enrollments where course_id = 't-free' and user_id = auth.uid()) = 1,
            'enroll_free creates exactly one enrollment');
select t.ok((select source from public.enrollments where course_id = 't-free' and user_id = auth.uid()) = 'free',
            'enrollment records its source');
select t.denied($$delete from public.enrollments where course_id = 't-free'$$, 'client must not delete enrollments');

-- 3. can_access_lesson: enrollment + drip + free preview.
select t.ok(public.can_access_lesson('10000000-0000-0000-0000-000000000001'), 'enrolled lesson is accessible');
select t.ok(not public.can_access_lesson('10000000-0000-0000-0000-000000000002'), 'dripped lesson is locked for 7 days');
select t.ok(public.can_access_lesson('20000000-0000-0000-0000-000000000001'), 'free preview is accessible without enrollment');
select t.ok(not public.can_access_lesson('20000000-0000-0000-0000-000000000002'), 'paid lesson is not accessible without enrollment');

-- 4. No direct progress writes (they used to let anyone "complete" any course).
select t.denied($$insert into public.lesson_progress (user_id, lesson_id, completed_at)
                  values ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000002', now())$$,
                'client must not insert lesson_progress directly');

-- 5. complete_lesson enforces access and drip; completing twice emits one event.
select t.denied($$select public.complete_lesson('20000000-0000-0000-0000-000000000002')$$, 'cannot complete a lesson without access');
select t.denied($$select public.complete_lesson('10000000-0000-0000-0000-000000000002')$$, 'cannot complete a dripped (locked) lesson');
select public.complete_lesson('10000000-0000-0000-0000-000000000001');
select public.complete_lesson('10000000-0000-0000-0000-000000000001');
select t.ok((select completed_at is not null from public.lesson_progress
             where lesson_id = '10000000-0000-0000-0000-000000000001'), 'complete_lesson marks completion');
select t.denied($$update public.lesson_progress set completed_at = null, watch_seconds = 9999$$,
                'client must not update lesson_progress directly');

-- 6. Recording watch time never clears a completion and never goes backwards.
select public.record_lesson_progress('10000000-0000-0000-0000-000000000001', 42);
select t.ok((select completed_at is not null and watch_seconds = 42 from public.lesson_progress
             where lesson_id = '10000000-0000-0000-0000-000000000001'), 'record_lesson_progress keeps completed_at');
select public.record_lesson_progress('10000000-0000-0000-0000-000000000001', 10);
select t.ok((select watch_seconds = 42 from public.lesson_progress
             where lesson_id = '10000000-0000-0000-0000-000000000001'), 'watch_seconds never goes backwards');
select t.denied($$select public.record_lesson_progress('20000000-0000-0000-0000-000000000002', 5)$$,
                'cannot record progress without access');

-- 7. Quiz: answers are not readable by clients; completion needs a server-recorded pass.
select t.ok((select count(*) from public.quiz_questions) = 1, 'enrolled user can read quiz question prompts');
select t.denied($$select correct from public.quiz_questions$$, 'quiz answers are not readable by clients');
select t.denied($$select explanation from public.quiz_questions$$, 'quiz explanations are not readable before grading');
select t.denied($$insert into public.quiz_attempts (user_id, lesson_id, score, passed, answers)
                  values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000003', 100, true, '{}')$$,
                'client must not self-report quiz attempts');
select t.denied($$select public.complete_lesson('10000000-0000-0000-0000-000000000003')$$, 'quiz lesson needs a passed attempt');
reset role;
insert into public.quiz_attempts (user_id, lesson_id, score, passed, answers)
  values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000003', 90, true, '{}');
set role authenticated;
select public.complete_lesson('10000000-0000-0000-0000-000000000003');

-- 8. Completing every lesson issues exactly one certificate (trigger path), verifiable by code.
select public.enroll_free('t-cert');
select public.complete_lesson('30000000-0000-0000-0000-000000000001');
select public.complete_lesson('30000000-0000-0000-0000-000000000002');
select t.ok((select count(*) from public.certificates where course_id = 't-cert' and user_id = auth.uid()) = 1,
            'finishing the course issues one certificate');
select t.ok((select student_name from public.verify_certificate(
               (select code from public.certificates where course_id = 't-cert' and user_id = auth.uid()))) = 'Alice',
            'issued certificate is verifiable by code');

-- 9. Events are recorded once per fact and are not client-readable or writable.
reset role;
select t.ok((select count(*) from public.events where type = 'enrollment.created'
             and user_id = '00000000-0000-0000-0000-00000000000a') = 2, 'one enrollment.created per enrollment');
select t.ok((select count(*) from public.events where type = 'lesson.completed'
             and user_id = '00000000-0000-0000-0000-00000000000a') = 4, 'lesson.completed emitted once per lesson');
set role authenticated;
select t.ok((select count(*) from public.events) = 0, 'events are not readable by clients');
select t.denied($$insert into public.events (type) values ('fake')$$, 'events are not writable by clients');

-- 10. Expired enrollment grants nothing (and quiz questions follow the same rule).
select t.login('00000000-0000-0000-0000-00000000000c');
select t.ok(not public.can_access_lesson('10000000-0000-0000-0000-000000000001'), 'expired enrollment has no access');
select t.ok((select count(*) from public.quiz_questions) = 0, 'expired enrollment cannot read quiz questions');

-- 11. Student videos: owners cannot self-approve (moderation stays with admins).
select t.login('00000000-0000-0000-0000-00000000000a');
insert into public.student_videos (user_id, title, is_public, consent_public, approved, status)
  values ('00000000-0000-0000-0000-00000000000a', 'My dance', true, true, true, 'ready');
update public.student_videos set approved = true, title = 'My dance (edited)';
reset role;
select t.ok((select not approved and title = 'My dance (edited)' from public.student_videos
             where user_id = '00000000-0000-0000-0000-00000000000a'), 'approved flag is admin-only; other edits still work');
update public.student_videos set approved = true;  -- superuser / service role may approve
select t.ok((select approved from public.student_videos where user_id = '00000000-0000-0000-0000-00000000000a'),
            'service role can approve');

-- 12. Certificates & achievements: own rows only; anon uses verify_certificate().
insert into public.certificates (code, user_id, course_id, student_name, course_title)
  values ('abc123', '00000000-0000-0000-0000-00000000000b', 't-paid', 'Bob', 'Paid course');
insert into public.achievements (user_id, code) values ('00000000-0000-0000-0000-00000000000b', 'first_lesson');
set role authenticated;
select t.login('00000000-0000-0000-0000-00000000000a');
select t.ok((select count(*) from public.certificates where user_id = '00000000-0000-0000-0000-00000000000b') = 0,
            'cannot list other users certificates');
select t.ok((select count(*) from public.achievements where user_id = '00000000-0000-0000-0000-00000000000b') = 0,
            'cannot list other users achievements');
set role anon;
select set_config('request.jwt.claims', '', false);
select t.ok((select count(*) from public.certificates) = 0, 'anon cannot list certificates');
select t.ok((select student_name from public.verify_certificate('abc123')) = 'Bob', 'verify_certificate works by code');
select t.ok((select count(*) from public.verify_certificate('nope')) = 0, 'unknown code returns nothing');

reset role;
