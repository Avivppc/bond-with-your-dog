-- Member notification settings: a switched-off type writes nothing, wording comes from the settings
-- (with {{first_name}}), the phone switch decides what gets pushed, and only the server reads them.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

create temp table who as select id from auth.users order by created_at limit 1;
grant select on who to service_role, authenticated;
update public.profiles set full_name = 'Dana Levi' where id = (select id from who);
delete from public.notifications where user_id = (select id from who);

select t.ok(private.fill_template('Hi {{first_name}}, {{dog_name}} did {{ odd }} great', '{"first_name":"Dana"}') = 'Hi Dana, did great', 'tags fill, missing ones vanish');

-- Custom wording with the member's first name.
update public.notification_settings
   set settings = jsonb_set(settings, '{topics,support_answered,title}', '"Hi {{first_name}}, we answered"')
 where id = 1;
select private.notify_topic('support_answered', (select id from who), 'support', '{"subject":"Video won''t play"}', '/help', 'fallback');
select t.ok((select title = 'Hi Dana, we answered' and body = 'Video won''t play' and topic = 'support_answered'
               from public.notifications where user_id = (select id from who) and topic = 'support_answered'), 'wording comes from the settings');

-- Switched off: nothing is written.
update public.notification_settings
   set settings = jsonb_set(settings, '{topics,achievement,enabled}', 'false')
 where id = 1;
select private.notify_topic('achievement', (select id from who), 'achievement', '{"achievement":"x"}', '/progress', 'fallback');
select t.ok((select count(*) = 0 from public.notifications where user_id = (select id from who) and topic = 'achievement'), 'a switched-off type writes nothing');

-- Phone switch: practice off, support on.
update public.notification_settings
   set settings = jsonb_set(settings, '{topics,practice,push}', 'false')
 where id = 1;
insert into public.notifications (user_id, kind, title, topic) values ((select id from who), 'system', 'Practice today', 'practice');
set role service_role;
create temp table claimed as select * from public.claim_push_notifications((select id from who), 30, 100);
select t.ok((select count(*) = 1 and bool_and(kind = 'support') from claimed), 'only types with the phone switch on are pushed');
reset role;

-- Reminders record their topic (the old seven-argument call still works).
set role service_role;
select t.ok(public.deliver_reminder((select id from who), 'practice', 'test-day', 'system', 'Practice', null, '/plan', 'practice'), 'a reminder is delivered');
select t.ok(public.deliver_reminder((select id from who), 'practice', 'test-day-2', 'system', 'Practice', null, '/plan'), 'the call without a topic still works');
reset role;
select t.ok((select count(*) = 1 from public.notifications where user_id = (select id from who) and title = 'Practice' and topic = 'practice'), 'the topic is stored');

set role authenticated;
select t.denied($$ select * from public.notification_settings $$, 'members cannot read the settings');
reset role;

rollback;
