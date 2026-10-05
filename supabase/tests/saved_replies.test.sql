-- Saved replies: only the service role reads or writes them, and empty texts are refused.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

set role service_role;
insert into public.saved_replies (title, body) values ('Great start', 'Hi {{first_name}}!');
select t.ok((select count(*) = 1 from public.saved_replies where title = 'Great start'), 'the team can save a reply');
select t.fails_with($$ insert into public.saved_replies (title, body) values ('   ', 'Hi') $$, '23514', 'a reply needs a name');
select t.fails_with($$ insert into public.saved_replies (title, body) values ('Empty', '') $$, '23514', 'a reply needs a text');
reset role;

set role authenticated;
select t.denied($$ select * from public.saved_replies $$, 'members cannot read saved replies');
select t.denied($$ insert into public.saved_replies (title, body) values ('x', 'y') $$, 'members cannot add saved replies');
reset role;

set role anon;
select t.denied($$ select * from public.saved_replies $$, 'visitors cannot read saved replies');
reset role;

rollback;
