-- Deferred email verification: members sign in instantly, but only a server-written
-- inbox proof unlocks anything granted by email. Plus the onboarding course choice.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000ee01', 'Proven@Member.dev', now()),
  ('00000000-0000-0000-0000-00000000ee02', 'instant@member.dev', now());
insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-00000000ee01', 'Proven'),
  ('00000000-0000-0000-0000-00000000ee02', 'Instant')
on conflict (id) do nothing;
insert into public.email_verifications (user_id, email) values
  ('00000000-0000-0000-0000-00000000ee01', 'proven@member.dev');
insert into public.courses (id, title, description, level, category, price, published)
  values ('ev-course', 'Foundations', 'd', 'Beginner', 'Foundations', 0, true);

select t.ok(public.verified_email('00000000-0000-0000-0000-00000000ee01') = 'proven@member.dev',
            'proof matches the current email, case-insensitive');
select t.ok(public.verified_email('00000000-0000-0000-0000-00000000ee02') is null,
            'auto-confirmed signup without proof is not verified');
select t.ok((select verified from public.find_account_by_email(' PROVEN@member.dev ')), 'admin lookup sees proven accounts');
select t.ok(not (select verified from public.find_account_by_email('instant@member.dev')), 'admin lookup flags unproven accounts');
select t.ok(not exists (select 1 from public.find_account_by_email('nobody@member.dev')), 'unknown email → no row');

set role authenticated;
select t.login('00000000-0000-0000-0000-00000000ee02');
select t.ok(not public.my_email_verified(), 'member sees they are not verified yet');
select t.denied($$insert into public.email_verifications (user_id, email) values ('00000000-0000-0000-0000-00000000ee02', 'instant@member.dev')$$,
                'members cannot mark themselves verified');
select t.denied($$select count(*) from public.email_verifications$$, 'verifications are server-only');
select t.ok(not has_function_privilege('authenticated', 'public.find_account_by_email(text)', 'execute'),
            'clients cannot look up accounts by email');
select t.ok(not has_function_privilege('authenticated', 'public.verified_email(uuid)', 'execute'),
            'clients cannot probe other members');

update public.profiles set chosen_course_id = 'ev-course' where id = '00000000-0000-0000-0000-00000000ee02';
select t.ok((select chosen_course_id from public.profiles where id = '00000000-0000-0000-0000-00000000ee02') = 'ev-course',
            'member saves their chosen course');
select t.fails_with($$update public.profiles set chosen_course_id = 'no-such-course' where id = '00000000-0000-0000-0000-00000000ee02'$$,
                    '23503', 'chosen course must exist');

select t.login('00000000-0000-0000-0000-00000000ee01');
select t.ok(public.my_email_verified(), 'proven member is verified');
reset role;

-- Changing the account email voids the proof until the new address is verified.
update auth.users set email = 'moved@member.dev' where id = '00000000-0000-0000-0000-00000000ee01';
select t.ok(public.verified_email('00000000-0000-0000-0000-00000000ee01') is null, 'new email needs its own proof');
