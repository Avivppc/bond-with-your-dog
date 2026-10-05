-- Phone notifications: subscriptions are server-only, and each recent notification is claimed for
-- pushing exactly once (achievements and old notifications never).
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

create temp table who as select id from auth.users order by created_at limit 1;
grant select on who to service_role, authenticated;
delete from public.notifications where user_id = (select id from who);
insert into public.notifications (user_id, kind, title, body, href, created_at) values
  ((select id from who), 'feedback', 'Roni replied', 'See her notes', '/feedback', now()),
  ((select id from who), 'achievement', 'Badge', 'Nice', '/progress', now()),
  ((select id from who), 'lesson', 'Old lesson', 'Ages ago', '/learn', now() - interval '2 hours');

set role service_role;
select t.ok((select count(*) = 1 from public.claim_push_notifications((select id from who), 30, 100)), 'only the recent, non-achievement notification is claimed');
select t.ok((select count(*) = 0 from public.claim_push_notifications((select id from who), 30, 100)), 'a claimed notification is never claimed again');
select t.ok((select count(*) = 0 from public.claim_push_notifications(null, 30, 100) where user_id = (select id from who)), 'claiming for everyone skips it too');

insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ((select id from who), 'https://fcm.googleapis.com/fcm/send/abc', 'key', 'secret');
select t.fails_with($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ((select id from who), 'http://fcm.googleapis.com/x', 'k', 's') $$, '23514', 'push addresses must be https');
select t.fails_with($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ((select id from who), 'https://evil.example/x', 'k', 's') $$, '23514', 'only the browsers'' push services');
select t.fails_with($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ((select id from who), 'https://fcm.googleapis.com.evil.example/x', 'k', 's') $$, '23514', 'a look-alike host is refused');
reset role;

set role authenticated;
select t.denied($$ select * from public.push_subscriptions $$, 'members cannot read subscriptions directly');
select t.denied($$ select * from public.claim_push_notifications(null, 30, 100) $$, 'members cannot claim notifications');
reset role;

rollback;
