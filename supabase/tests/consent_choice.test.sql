-- Service emails go to everyone who hasn't unsubscribed; marketing emails need consent.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000d1001', 'noconsent@test.dev'),
  ('00000000-0000-0000-0000-0000000d1002', 'gone@test.dev');
insert into public.profiles (id, marketing_opt_in) values
  ('00000000-0000-0000-0000-0000000d1001', false), ('00000000-0000-0000-0000-0000000d1002', true)
on conflict (id) do update set marketing_opt_in = excluded.marketing_opt_in;
insert into public.email_unsubscribes (user_id, email, source) values ('00000000-0000-0000-0000-0000000d1002', 'gone@test.dev', 'link');

set role service_role;
select t.ok(not public.can_email('00000000-0000-0000-0000-0000000d1001', 'noconsent@test.dev', true), 'marketing: no consent, no email');
select t.ok(public.can_email('00000000-0000-0000-0000-0000000d1001', 'noconsent@test.dev', false), 'service: no consent needed');
select t.ok(not public.can_email('00000000-0000-0000-0000-0000000d1002', 'gone@test.dev', false), 'service: never after an unsubscribe');
select t.ok(not public.can_email(null, 'GONE@test.dev', false), 'an unsubscribed member stays out even when found by address');
select t.ok((select 'noconsent@test.dev' = any(array_agg(email)) from public.campaign_audience('{"kind": "all_members", "consent": "all"}')),
            'a service campaign reaches members without consent');
select t.ok((select not 'noconsent@test.dev' = any(array_agg(email)) and not 'gone@test.dev' = any(array_agg(email))
             from public.campaign_audience('{"kind": "all_members"}')), 'a marketing campaign (the default) doesn''t');
select t.ok((select not 'gone@test.dev' = any(array_agg(email)) from public.campaign_audience('{"kind": "all_members", "consent": "all"}')),
            'unsubscribed people are out of service campaigns too');
reset role;

set role authenticated;
select t.login('00000000-0000-0000-0000-0000000d1001');
select t.fails_with($$select public.can_email(null, 'x@test.dev', false)$$, '42501', 'members can''t call can_email');
reset role;

rollback;
