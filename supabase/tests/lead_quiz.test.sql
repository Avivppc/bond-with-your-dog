-- Lead quiz content: one row at most, server-only (members and visitors can't read or change it).
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-0000000b1001', 'quizmember@test.dev', now());

insert into public.lead_quiz_config (questions, results, updated_by)
values ('[]', '{}', '00000000-0000-0000-0000-0000000b1001');
select t.ok((select id from public.lead_quiz_config) = 1, 'the row is id 1 by default');

-- Singleton: no second row, no other id.
select t.fails_with($$insert into public.lead_quiz_config (id, questions, results) values (2, '[]', '{}')$$,
                    '23514', 'only id 1 is allowed');
select t.fails_with($$insert into public.lead_quiz_config (questions, results) values ('[]', '{}')$$,
                    '23505', 'there is only one row');

-- JSON shape basics.
select t.fails_with($$update public.lead_quiz_config set questions = '{}'$$, '23514', 'questions are a list');
select t.fails_with($$update public.lead_quiz_config set results = '[]'$$, '23514', 'results are an object');

-- Deleting the editor keeps the quiz.
delete from auth.users where id = '00000000-0000-0000-0000-0000000b1001';
select t.ok((select updated_by is null from public.lead_quiz_config where id = 1), 'removing the editor keeps the quiz');

-- Members can't read or change it.
set role authenticated;
select t.login('00000000-0000-0000-0000-0000000b1001');
select t.denied($$select * from public.lead_quiz_config$$, 'members cannot read the quiz config');
select t.denied($$update public.lead_quiz_config set questions = '[]'$$, 'members cannot edit the quiz config');
select t.denied($$delete from public.lead_quiz_config$$, 'members cannot reset the quiz config');
select t.denied($$insert into public.lead_quiz_config (id, questions, results) values (1, '[]', '{}')$$, 'members cannot create the quiz config');
reset role;

-- Visitors can't either.
set role anon;
select t.denied($$select * from public.lead_quiz_config$$, 'visitors cannot read the quiz config');
select t.denied($$update public.lead_quiz_config set results = '{}'$$, 'visitors cannot edit the quiz config');
reset role;

-- The server (service role) can.
set role service_role;
select t.ok((select count(*) from public.lead_quiz_config) = 1, 'the server reads the quiz config');
update public.lead_quiz_config set results = '{"x": 1}';
reset role;

rollback;
