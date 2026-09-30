-- Granting access by email to people who may not have an account yet (e.g. students moving from Kajabi).
\set ON_ERROR_STOP 1

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'Existing@Student.dev', now()),
  ('00000000-0000-0000-0000-0000000000c2', 'late@student.dev', now()),
  ('00000000-0000-0000-0000-0000000000c3', 'unverified@student.dev', null);

insert into public.courses (id, title, description, level, category, price, published)
  values ('inv-course', 'Invite course', 'd', 'Beginner', 'Foundations', 49, true);
insert into public.offers (id, slug, title, payment_type, price_cents, status)
  values ('a2000000-0000-0000-0000-000000000001', 'inv-offer', 'Invite offer', 'one_time', 4900, 'published');
insert into public.offer_courses (offer_id, course_id) values ('a2000000-0000-0000-0000-000000000001', 'inv-course');

select t.ok(public.find_user_id_by_email('existing@student.dev') = '00000000-0000-0000-0000-0000000000c1',
            'finds users by email, case-insensitive');
select t.ok(public.find_user_id_by_email('nobody@student.dev') is null, 'unknown email → null');

insert into public.access_invites (email, offer_id, days_of_access) values
  ('late@student.dev', 'a2000000-0000-0000-0000-000000000001', 30),
  ('unverified@student.dev', 'a2000000-0000-0000-0000-000000000001', null);
select t.fails_with($$insert into public.access_invites (email, offer_id) values ('LATE@student.dev', 'a2000000-0000-0000-0000-000000000001')$$,
                    '23505', 'one pending invite per email and offer');

set role authenticated;
select t.ok(not has_function_privilege('authenticated', 'public.find_user_id_by_email(text)', 'execute'),
            'clients cannot look up users by email');
select t.denied($$select count(*) from public.access_invites$$, 'access invites are server-only');

select t.login('00000000-0000-0000-0000-0000000000c3');
select t.ok(public.claim_access_invites() = 0, 'unverified email claims nothing');

select t.login('00000000-0000-0000-0000-0000000000c2');
select t.ok(public.claim_access_invites() = 1, 'verified invitee claims their access');
select t.ok(public.claim_access_invites() = 0, 'claims happen once');
select t.ok((select expires_at between now() + interval '29 days' and now() + interval '31 days' from public.enrollments
             where course_id = 'inv-course'), 'invite length (30 days) is applied');
reset role;
select t.ok((select claimed_at is not null from public.access_invites where email = 'late@student.dev'), 'invite marked claimed');
