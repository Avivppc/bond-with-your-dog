-- Exit lists replace goals, one person can be paused, and local-time campaigns hold each message
-- until that time in the person's own zone.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000e2001', 'tlv@test.dev'),
  ('00000000-0000-0000-0000-0000000e2002', 'nyc@test.dev'),
  ('00000000-0000-0000-0000-0000000e2003', 'nowhere@test.dev');
insert into public.profiles (id, marketing_opt_in, timezone) values
  ('00000000-0000-0000-0000-0000000e2001', true, 'Asia/Jerusalem'),
  ('00000000-0000-0000-0000-0000000e2002', true, 'America/New_York'),
  ('00000000-0000-0000-0000-0000000e2003', true, null)
on conflict (id) do update set marketing_opt_in = excluded.marketing_opt_in, timezone = excluded.timezone;

-- A flow's old goal became its exit list; runs can be paused.
insert into public.email_flows (id, name, trigger, goal) values ('ae000000-0000-0000-0000-000000000001', 'Old', 'signed_up', '{"kind": "practiced"}');
update public.email_flows set exit_conditions = null where id = 'ae000000-0000-0000-0000-000000000001';
insert into public.email_flow_runs (id, flow_id, user_id, node_id, status)
values ('ae100000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000e2001', 't', 'paused');
select t.ok((select status from public.email_flow_runs where id = 'ae100000-0000-0000-0000-000000000001') = 'paused', 'a run can be paused');

-- A campaign at 10:00 local on 5 Oct reaches each person at their own 10:00.
insert into public.email_campaigns (id, name, status, audience, email, local_time, scheduled_local, fallback_zone)
values ('ae200000-0000-0000-0000-000000000001', 'Local', 'sending', '{"kind": "all_members"}', '{"subject": "Hi", "preheader": "", "blocks": []}',
        true, '2026-10-05T10:00', 'Europe/London');
set role service_role;
select public.enqueue_campaign('ae200000-0000-0000-0000-000000000001');
reset role;
select t.ok((select send_after = '2026-10-05T07:00:00Z' from public.email_messages where campaign_id = 'ae200000-0000-0000-0000-000000000001' and to_email = 'tlv@test.dev'),
            'Tel Aviv gets it at 10:00 Israel time');
select t.ok((select send_after = '2026-10-05T14:00:00Z' from public.email_messages where campaign_id = 'ae200000-0000-0000-0000-000000000001' and to_email = 'nyc@test.dev'),
            'New York gets it at 10:00 New York time');
select t.ok((select send_after = '2026-10-05T09:00:00Z' from public.email_messages where campaign_id = 'ae200000-0000-0000-0000-000000000001' and to_email = 'nowhere@test.dev'),
            'no time zone: the fallback zone (London) is used');

rollback;
