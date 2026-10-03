-- Automations: contact tags, campaigns to a tag, action steps logged once, chapters a flow gives.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-0000000a1001', 'tagged@test.dev', now()),
  ('00000000-0000-0000-0000-0000000a1002', 'plain@test.dev', now());
insert into public.profiles (id, marketing_opt_in)
values ('00000000-0000-0000-0000-0000000a1001', true), ('00000000-0000-0000-0000-0000000a1002', true)
on conflict (id) do update set marketing_opt_in = true;
insert into public.quiz_leads (first_name, email, tier, scores, answers, marketing_opt_in)
values ('Lee', 'taggedlead@test.dev', 'foundations', '{}', '{}', true);
insert into public.courses (id, title, description, level, category, price, published)
values ('fa-a', 'Foundations', 'd', 'Beginner', 'Foundations', 0, true);

-- Tags are one per address and tag, any letter case.
insert into public.contact_tags (email, user_id, tag) values ('tagged@test.dev', '00000000-0000-0000-0000-0000000a1001', 'vip');
insert into public.contact_tags (email, tag) values ('TaggedLead@test.dev', 'vip');
select t.fails_with($$insert into public.contact_tags (email, tag) values ('TAGGED@test.dev', 'vip')$$, '23505', 'a tag is on an address once');
select t.fails_with($$insert into public.contact_tags (email, tag) values ('x@test.dev', 'Bad Tag!')$$, '23514', 'tags are lower case words');

set role service_role;
select t.ok((select array_agg(email order by email) from public.campaign_audience('{"kind": "has_tag", "tag": "VIP"}')) = array['tagged@test.dev', 'taggedlead@test.dev'],
            'a campaign to a tag reaches tagged members and leads, not the rest');
reset role;

-- Action steps: done once per person and step; failures can repeat.
insert into public.email_flows (id, name, trigger) values ('fa000000-0000-0000-0000-000000000001', 'Actions', 'signed_up');
insert into public.email_flow_runs (id, flow_id, user_id, node_id)
values ('fa100000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000a1001', 't');
insert into public.email_flow_actions (run_id, node_id, action, status) values ('fa100000-0000-0000-0000-000000000001', 'a1', 'webhook', 'failed');
insert into public.email_flow_actions (run_id, node_id, action, status) values ('fa100000-0000-0000-0000-000000000001', 'a1', 'webhook', 'failed');
insert into public.email_flow_actions (run_id, node_id, action, status) values ('fa100000-0000-0000-0000-000000000001', 'a1', 'webhook', 'done');
select t.fails_with($$insert into public.email_flow_actions (run_id, node_id, action, status) values ('fa100000-0000-0000-0000-000000000001', 'a1', 'webhook', 'done')$$,
                    '23505', 'an action step is done once per person');

-- A flow can give a chapter (its own enrollment source).
insert into public.enrollments (user_id, course_id, source, access_level) values ('00000000-0000-0000-0000-0000000a1002', 'fa-a', 'flow', 'full');
select t.ok((select source from public.enrollments where user_id = '00000000-0000-0000-0000-0000000a1002' and course_id = 'fa-a') = 'flow', 'enrollments accept source "flow"');

-- Members can't see tags or action logs.
set role authenticated;
select t.login('00000000-0000-0000-0000-0000000a1001');
select t.ok((select count(*) from public.contact_tags) = 0, 'tags are server-only');
select t.ok((select count(*) from public.email_flow_actions) = 0, 'action logs are server-only');
reset role;

rollback;
