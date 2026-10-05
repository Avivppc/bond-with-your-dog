-- The dashboard's last-24-hours numbers and activity feed, and that only the service role reads them.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000d0001', 'fresh@test.dev'),
  ('00000000-0000-0000-0000-0000000d0002', 'older@test.dev');
insert into public.profiles (id, full_name, created_at) values
  ('00000000-0000-0000-0000-0000000d0001', 'Fresh', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-0000000d0002', 'Older', now() - interval '30 hours')
on conflict (id) do update set full_name = excluded.full_name, created_at = excluded.created_at;
insert into public.quiz_leads (first_name, email, tier, scores, answers, created_at)
values ('Lea', 'lea@test.dev', 'moves', '{}', '{}', now() - interval '1 hour');

set role service_role;
select t.ok((select current_value >= 1 and previous_value >= 1 from public.admin_last_day('USD') where metric = 'signups'),
            'sign-ups split into the last 24 hours and the day before');
select t.ok((select current_value >= 1 from public.admin_last_day('USD') where metric = 'leads'), 'quiz leads are counted');
select t.ok((select count(*) = 6 from public.admin_last_day('USD')), 'six numbers come back');
select t.ok(exists (select 1 from public.admin_recent_activity(50) where kind = 'lead' and email = 'lea@test.dev' and detail = 'moves'),
            'a quiz lead shows in the feed with its email and tier');
select t.ok(exists (select 1 from public.admin_recent_activity(50) where kind = 'signup' and email = 'fresh@test.dev' and full_name = 'Fresh'),
            'a sign-up shows with the account email and name');
select t.ok((select count(*) <= 3 from public.admin_recent_activity(3)), 'the feed respects its limit');
insert into public.job_runs (job, last_ok_at) values ('flows', now()) on conflict (job) do update set last_ok_at = excluded.last_ok_at;
select t.ok((select last_ok_at is not null from public.job_runs where job = 'flows'), 'the service role records a heartbeat');
reset role;

set role authenticated;
select t.denied($$ select public.admin_last_day('USD') $$, 'members cannot read the dashboard numbers');
select t.denied($$ select public.admin_recent_activity(5) $$, 'members cannot read the activity feed');
select t.ok((select count(*) = 0 from public.job_runs), 'members see no job heartbeats');
reset role;

rollback;
