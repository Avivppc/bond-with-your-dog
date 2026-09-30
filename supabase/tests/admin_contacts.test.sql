-- Admin contacts, dashboard cards and inbox functions (20261013000000_admin_contacts.sql).
\set ON_ERROR_STOP 1

create temp table before_counts as select * from public.admin_dashboard_counts();

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000e0001', 'buyer-ac@test.dev'),
  ('00000000-0000-0000-0000-0000000e0002', 'lapsed-ac@test.dev'),
  ('00000000-0000-0000-0000-0000000e0003', 'nobody-ac@test.dev');
insert into public.profiles (id, full_name, marketing_opt_in) values
  ('00000000-0000-0000-0000-0000000e0001', 'Buyer Person', true),
  ('00000000-0000-0000-0000-0000000e0002', 'Lapsed Person', false)
on conflict (id) do update set full_name = excluded.full_name, marketing_opt_in = excluded.marketing_opt_in;

insert into public.courses (id, title, description, level, category, price, published) values
  ('ac-course', 'Admin contacts course', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.enrollments (user_id, course_id, source, expires_at) values
  ('00000000-0000-0000-0000-0000000e0001', 'ac-course', 'grant', null),
  ('00000000-0000-0000-0000-0000000e0002', 'ac-course', 'grant', now() - interval '1 day');

-- ── Lifetime value is net of refunds, per currency ──
insert into public.payments (event_key, user_id, provider, kind, amount_cents, currency) values
  ('ac:charge:1', '00000000-0000-0000-0000-0000000e0001', 'test', 'charge', 10000, 'USD'),
  ('ac:charge:2', '00000000-0000-0000-0000-0000000e0001', 'test', 'charge', 5000, 'USD'),
  ('ac:refund:2', '00000000-0000-0000-0000-0000000e0001', 'test', 'refund', 5000, 'USD'),
  ('ac:charge:3', '00000000-0000-0000-0000-0000000e0001', 'test', 'charge', 2000, 'EUR');

select t.ok(
  (select lifetime_value from public.admin_people_extras(array['00000000-0000-0000-0000-0000000e0001']::uuid[]))
    = '[{"currency": "USD", "net_cents": 10000}, {"currency": "EUR", "net_cents": 2000}]'::jsonb,
  'lifetime value subtracts refunds and stays per currency');
select t.ok((select marketing_opt_in from public.admin_people_extras(array['00000000-0000-0000-0000-0000000e0001']::uuid[])),
  'email marketing consent comes from the profile');
select t.ok(
  (select lifetime_value = '[]'::jsonb and not marketing_opt_in
     from public.admin_people_extras(array['00000000-0000-0000-0000-0000000e0003']::uuid[])),
  'contacts without payments or a profile get an empty value and no consent');
select t.ok((select count(*) from public.admin_people_extras(array[]::uuid[])) = 0, 'no ids, no rows');

-- ── Dashboard counts: only live enrollments count as active students ──
insert into public.feedback_videos (user_id, title, status) values
  ('00000000-0000-0000-0000-0000000e0001', 'Spin try', 'waiting'),
  ('00000000-0000-0000-0000-0000000e0001', 'Old try', 'replied');
insert into public.support_requests (id, user_id, kind, body, status) values
  ('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000e0001', 'question', 'How often?', 'open'),
  ('e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000e0002', 'bug', 'Video stuck', 'open'),
  ('e1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000e0002', 'story', 'We did it!', 'closed');

select t.ok((select c.active_students - b.active_students from public.admin_dashboard_counts() c, before_counts b) = 1,
  'an expired enrollment is not an active student');
select t.ok((select c.videos_waiting - b.videos_waiting from public.admin_dashboard_counts() c, before_counts b) = 1,
  'only videos waiting for Roni are counted');
select t.ok((select c.open_inbox - b.open_inbox from public.admin_dashboard_counts() c, before_counts b) = 2,
  'open inbox items exclude closed ones');
select t.ok((select c.community_members - b.community_members from public.admin_dashboard_counts() c, before_counts b) = 1,
  'students with live access join the community while it is open to students');

-- ── Inbox listing ──
select t.ok((select count(*) from public.admin_list_support_requests('bug', null, 25, 0) where user_id = '00000000-0000-0000-0000-0000000e0002') = 1,
  'the inbox filters by kind');
select t.ok((select email from public.admin_list_support_requests('question', 'open', 25, 0) where id = 'e1000000-0000-0000-0000-000000000001') = 'buyer-ac@test.dev',
  'each item carries the member''s email');
select t.ok((select count(*) from public.admin_list_support_requests('story', 'open', 25, 0) where id = 'e1000000-0000-0000-0000-000000000003') = 0,
  'the inbox filters by status');
select t.ok((select requests from public.admin_support_counts() where kind = 'story' and status = 'closed') >= 1, 'counts group by kind and status');

-- ── Service role only ──
set role authenticated;
select t.login('00000000-0000-0000-0000-0000000e0001');
select t.denied($$select * from public.admin_people_extras(array['00000000-0000-0000-0000-0000000e0001']::uuid[])$$, 'members cannot read contact values');
select t.denied($$select * from public.admin_dashboard_counts()$$, 'members cannot read dashboard counts');
select t.denied($$select * from public.admin_list_support_requests(null, null, 25, 0)$$, 'members cannot read the inbox');
select t.denied($$select * from public.admin_support_counts()$$, 'members cannot read inbox counts');
reset role;
