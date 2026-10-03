-- "Ask Bonded": settings, conversations and messages are server-only; the helpers keep counters right.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-0000000a5001', 'asker@test.dev', now()),
  ('00000000-0000-0000-0000-0000000a5002', 'other@test.dev', now());

select t.ok((select count(*) from public.assistant_settings) = 1, 'settings start with one row');
select t.ok((select not members_enabled and not sales_enabled from public.assistant_settings where id = 1), 'the assistant starts switched off');
select t.fails_with($$insert into public.assistant_settings (id) values (2)$$, '23514', 'settings are a single row');
select t.fails_with($$update public.assistant_settings set extra_instructions = repeat('x', 2001)$$, '23514', 'owner instructions are at most 2000 characters');

-- Ownership: a member chat needs a member, a sales chat a visitor cookie.
select t.fails_with($$insert into public.assistant_conversations (mode) values ('member')$$, '23514', 'a member chat needs a member');
select t.fails_with($$insert into public.assistant_conversations (mode) values ('sales')$$, '23514', 'a sales chat needs a visitor id');
select t.fails_with($$insert into public.assistant_conversations (mode, visitor_id) values ('other', 'abcdefgh12')$$, '23514', 'only member and sales modes');

insert into public.assistant_conversations (id, mode, user_id) values
  ('a5000000-0000-0000-0000-000000000001', 'member', '00000000-0000-0000-0000-0000000a5001');
insert into public.assistant_conversations (id, mode, visitor_id, ip_hash) values
  ('a5000000-0000-0000-0000-000000000002', 'sales', 'visitor-123456', 'iphash-1');

-- Recording an exchange saves both messages and bumps the counters.
set role service_role;
select public.assistant_record_exchange('a5000000-0000-0000-0000-000000000001', 'How do I teach a spin?', 'Lure in a circle.', 'anthropic', 900, 40, false);
select public.assistant_record_exchange('a5000000-0000-0000-0000-000000000001', 'My dog limps after practice', 'Please see a vet.', 'local', null, null, true);
select public.assistant_record_exchange('a5000000-0000-0000-0000-000000000002', 'How much is Moves?', 'It is $97.', 'anthropic', 500, 10, false);
reset role;
select t.ok((select message_count from public.assistant_conversations where id = 'a5000000-0000-0000-0000-000000000001') = 4, 'two exchanges count four messages');
select t.ok((select handed_off from public.assistant_conversations where id = 'a5000000-0000-0000-0000-000000000001'), 'a handoff sticks to the conversation');
select t.ok((select count(*) from public.assistant_messages where conversation_id = 'a5000000-0000-0000-0000-000000000001' and role = 'user') = 2, 'questions are saved');
select t.fails_with($$insert into public.assistant_messages (conversation_id, role, content) values ('a5000000-0000-0000-0000-000000000001', 'system', 'x')$$, '23514', 'only user and assistant messages');
select t.fails_with($$insert into public.assistant_messages (conversation_id, role, content) values ('a5000000-0000-0000-0000-000000000001', 'user', repeat('x', 4001))$$, '23514', 'messages are at most 4000 characters');

set role service_role;
select t.ok((select user_count = 2 and visitor_count = 0 and ip_count = 0
               from public.assistant_usage('00000000-0000-0000-0000-0000000a5001', null, null, now() - interval '1 day')),
            'usage counts a member''s questions');
select t.ok((select user_count = 0 and visitor_count = 1 and ip_count = 1
               from public.assistant_usage(null, 'visitor-123456', 'iphash-1', now() - interval '1 day')),
            'usage counts a visitor''s questions by cookie and IP');
select t.ok((select user_count = 0 from public.assistant_usage('00000000-0000-0000-0000-0000000a5002', null, null, now() - interval '1 day')),
            'another member starts at zero');
select t.ok((select count(*) from public.assistant_conversation_list(25, 0)) = 2, 'the admin list shows every conversation');
select t.ok((select first_question from public.assistant_conversation_list(25, 0) where id = 'a5000000-0000-0000-0000-000000000001') = 'How do I teach a spin?',
            'the admin list shows the first question');
select t.ok((select user_email from public.assistant_conversation_list(25, 0) where id = 'a5000000-0000-0000-0000-000000000001') = 'asker@test.dev',
            'the admin list shows the member''s email');
select t.ok((select last_provider from public.assistant_conversation_list(25, 0) where id = 'a5000000-0000-0000-0000-000000000001') = 'local',
            'the admin list shows the last reply''s provider');
reset role;

-- Members can't read or write any of it, or call the helpers.
set role authenticated;
select t.login('00000000-0000-0000-0000-0000000a5001');
select t.denied($$select * from public.assistant_settings$$, 'members cannot read settings');
select t.denied($$update public.assistant_settings set sales_enabled = true$$, 'members cannot change settings');
select t.denied($$select * from public.assistant_conversations$$, 'members cannot read conversations, even their own');
select t.denied($$insert into public.assistant_conversations (mode, user_id) values ('member', '00000000-0000-0000-0000-0000000a5001')$$, 'members cannot start conversations directly');
select t.denied($$select * from public.assistant_messages$$, 'members cannot read messages');
select t.denied($$insert into public.assistant_messages (conversation_id, role, content) values ('a5000000-0000-0000-0000-000000000001', 'user', 'hi')$$, 'members cannot write messages');
select t.denied($$select public.assistant_record_exchange('a5000000-0000-0000-0000-000000000001', 'q', 'a', null, null, null, false)$$, 'members cannot record exchanges');
select t.denied($$select * from public.assistant_usage('00000000-0000-0000-0000-0000000a5001', null, null, now())$$, 'members cannot read usage');
select t.denied($$select * from public.assistant_conversation_list(25, 0)$$, 'members cannot list conversations');
reset role;

-- Visitors (anon) neither.
set role anon;
select t.denied($$select * from public.assistant_settings$$, 'visitors cannot read settings');
select t.denied($$select * from public.assistant_conversations$$, 'visitors cannot read conversations');
select t.denied($$insert into public.assistant_conversations (mode, visitor_id) values ('sales', 'visitor-999999')$$, 'visitors cannot start conversations directly');
select t.denied($$select * from public.assistant_messages$$, 'visitors cannot read messages');
select t.denied($$delete from public.assistant_messages$$, 'visitors cannot delete messages');
select t.denied($$select * from public.assistant_conversation_list(25, 0)$$, 'visitors cannot list conversations');
reset role;

rollback;
