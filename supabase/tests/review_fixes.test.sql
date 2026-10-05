-- Review fixes: quiz leads can't be written from the browser, flows give/take back chapters
-- through grants, consent follows a lead who signs up, campaigns re-check consent per batch.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000c1001', 'grant@test.dev'),
  ('00000000-0000-0000-0000-0000000c1002', 'convert@test.dev');
insert into public.profiles (id, marketing_opt_in) values
  ('00000000-0000-0000-0000-0000000c1001', true), ('00000000-0000-0000-0000-0000000c1002', false)
on conflict (id) do update set marketing_opt_in = excluded.marketing_opt_in;
insert into public.courses (id, title, description, level, category, price, published)
values ('rf-a', 'Foundations', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.email_flows (id, name, trigger) values
  ('af000000-0000-0000-0000-000000000001'::uuid, 'Give', 'quiz_lead'),
  ('af000000-0000-0000-0000-000000000002'::uuid, 'Other', 'quiz_lead');

-- Anyone in the browser: no direct writes to quiz leads.
set role anon;
select t.fails_with($$insert into public.quiz_leads (first_name, email, tier, scores, answers, marketing_opt_in) values ('X', 'victim@test.dev', 'foundations', '{}', '{}', true)$$,
                    '42501', 'quiz leads can''t be written from the browser');
reset role;

set role service_role;
-- A flow gives a chapter as a grant; recomputes keep it; only that flow can take it back.
select t.ok(public.grant_flow_access('00000000-0000-0000-0000-0000000c1001', 'rf-a', 'af000000-0000-0000-0000-000000000001') = 'granted', 'a flow gives the chapter');
select t.ok(public.grant_flow_access('00000000-0000-0000-0000-0000000c1001', 'rf-a', 'af000000-0000-0000-0000-000000000001') = 'already', 'giving again is a no-op');
select t.ok(public.revoke_flow_access('00000000-0000-0000-0000-0000000c1001', 'rf-a', 'af000000-0000-0000-0000-000000000002') = 'none', 'another flow can''t take it back');
reset role;
select private.recompute_enrollment('00000000-0000-0000-0000-0000000c1001', 'rf-a');
select t.ok((select access_level = 'full' and (expires_at is null or expires_at > now()) from public.enrollments
             where user_id = '00000000-0000-0000-0000-0000000c1001' and course_id = 'rf-a'), 'the chapter survives a recompute');
set role service_role;
select t.ok(public.revoke_flow_access('00000000-0000-0000-0000-0000000c1001', 'rf-a', 'af000000-0000-0000-0000-000000000001') = 'revoked', 'the giving flow takes it back');
reset role;
select t.ok((select expires_at <= now() from public.enrollments where user_id = '00000000-0000-0000-0000-0000000c1001' and course_id = 'rf-a'), 'access ends once taken back');

-- A lead who ticked the box, then signed up without consent: their profile decides now.
insert into public.quiz_leads (first_name, email, tier, scores, answers, marketing_opt_in) values ('C', 'convert@test.dev', 'foundations', '{}', '{}', true);
set role service_role;
select t.ok(not public.can_market(null, 'convert@test.dev'), 'a lead who became a member follows the member''s choice');
reset role;

rollback;
