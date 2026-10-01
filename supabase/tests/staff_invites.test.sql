-- Stage A2: inviting the client's content team by email.
-- An invite becomes a staff role only for a signed-in user whose email is VERIFIED
-- (otherwise anyone could sign up with the invited address and take the role).
\set ON_ERROR_STOP 1

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000f1', 'Client@Studio.dev', now()),   -- verified, mixed case
  ('00000000-0000-0000-0000-0000000000f2', 'squatter@studio.dev', null),  -- not verified
  ('00000000-0000-0000-0000-0000000000f3', 'nobody@studio.dev', now()),   -- verified, not invited
  ('00000000-0000-0000-0000-0000000000f4', 'grabbed@studio.dev', now());  -- auto-confirmed signup, inbox never proven
-- Inbox proof (written by the server after an emailed link or Google sign-in).
insert into public.email_verifications (user_id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'client@studio.dev'),
  ('00000000-0000-0000-0000-0000000000f3', 'nobody@studio.dev');

insert into public.staff_invites (email, role) values
  ('client@studio.dev', 'editor'),
  ('squatter@studio.dev', 'editor'),
  ('grabbed@studio.dev', 'owner');

select t.fails_with($$insert into public.staff_invites (email, role) values ('CLIENT@studio.dev', 'owner')$$,
                    '23505', 'one pending invite per email, case-insensitive');

set role authenticated;

-- Clients cannot see or create invites.
select t.login('00000000-0000-0000-0000-0000000000f3');
select t.denied($$select count(*) from public.staff_invites$$, 'invites are not readable by clients');
select t.denied($$insert into public.staff_invites (email, role) values ('nobody@studio.dev', 'owner')$$,
                'clients cannot invite themselves');
select t.ok(public.claim_staff_invite() is null, 'no invite → no role');

-- Unverified email cannot claim.
select t.login('00000000-0000-0000-0000-0000000000f2');
select t.ok(public.claim_staff_invite() is null, 'unverified email cannot claim an invite');
select t.ok(public.current_staff_role() is null, 'and gets no staff role');

select t.login('00000000-0000-0000-0000-0000000000f4');
select t.ok(public.claim_staff_invite() is null, 'instant signup without inbox proof cannot claim an invite');

-- Verified invitee claims once; email match is case-insensitive.
select t.login('00000000-0000-0000-0000-0000000000f1');
select t.ok(public.claim_staff_invite() = 'editor', 'verified invitee becomes editor');
select t.ok(public.current_staff_role() = 'editor', 'role is persisted');
select t.ok(public.claim_staff_invite() = 'editor', 'claiming again is harmless');

reset role;
select t.ok((select accepted_at is not null from public.staff_invites where email = 'client@studio.dev'),
            'invite is marked accepted');
select t.ok((select accepted_at is null from public.staff_invites where email = 'squatter@studio.dev'),
            'unclaimed invite stays pending');

set role anon;
select set_config('request.jwt.claims', '', false);
select t.ok(not has_function_privilege('anon', 'public.claim_staff_invite()', 'execute'), 'anon cannot claim');
reset role;
