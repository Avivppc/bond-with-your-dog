-- Surveys: one answer per member, server-only tables, checkpoint quiz numbers for the admin only.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000b1001', 'surveyed@test.dev');
insert into public.courses (id, title, description, level, category, price, published)
values ('sv-a', 'Foundations', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.lessons (id, course_id, title, position, published, kind, pass_threshold)
values ('5b000000-0000-0000-0000-000000000001', 'sv-a', 'Checkpoint', 1, true, 'quiz', 80);
insert into public.quiz_attempts (user_id, lesson_id, score, passed, answers) values
  ('00000000-0000-0000-0000-0000000b1001', '5b000000-0000-0000-0000-000000000001', 60, false, '{}'),
  ('00000000-0000-0000-0000-0000000b1001', '5b000000-0000-0000-0000-000000000001', 100, true, '{}');

insert into public.surveys (id, title, questions, status, course_id)
values ('5a000000-0000-0000-0000-000000000001', 'Check-in', '[{"id":"q1","type":"rating","prompt":"Fun?","required":true,"options":[]}]', 'published', 'sv-a');
insert into public.survey_responses (survey_id, user_id, answers) values ('5a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000b1001', '{"q1": 5}');
select t.fails_with($$insert into public.survey_responses (survey_id, user_id, answers) values ('5a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000b1001', '{"q1": 4}')$$,
                    '23505', 'one answer per member and survey');
select t.fails_with($$insert into public.surveys (title, questions) values ('Bad', '{}')$$, '23514', 'questions must be a list');

set role service_role;
select t.ok((select attempts = 2 and members = 1 and passed_members = 1 and average_score = 80 and pass_threshold = 80
             from public.admin_quiz_stats() where lesson_id = '5b000000-0000-0000-0000-000000000001'),
            'checkpoint numbers: attempts, members, passed, average');
reset role;

set role authenticated;
select t.login('00000000-0000-0000-0000-0000000b1001');
select t.ok((select count(*) from public.surveys) = 0, 'surveys are read through the server only');
select t.ok((select count(*) from public.survey_responses) = 0, 'members can''t read answers directly, even their own');
select t.fails_with($$select * from public.admin_quiz_stats()$$, '42501', 'members can''t read checkpoint numbers');
reset role;

rollback;
