-- Private staff notes on a contact: server-only, cascade with the contact, sane bodies.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, email_confirmed_at) values
  ('0a7e5000-0000-0000-0000-0000000000e1', 'noted@contact.dev', now()),
  ('0a7e5000-0000-0000-0000-0000000000e2', 'author@staff.dev', now());

insert into public.contact_notes (contact_id, author_id, body) values
  ('0a7e5000-0000-0000-0000-0000000000e1', '0a7e5000-0000-0000-0000-0000000000e2', 'Prefers WhatsApp');
select t.ok((select count(*) from public.contact_notes where contact_id = '0a7e5000-0000-0000-0000-0000000000e1') = 1,
            'staff (service role) can add a note');

select t.fails_with($$insert into public.contact_notes (contact_id, body) values ('0a7e5000-0000-0000-0000-0000000000e1', '   ')$$,
                    '23514', 'a blank note is rejected');
select t.fails_with($$insert into public.contact_notes (contact_id, body) values ('0a7e5000-0000-0000-0000-0000000000e1', repeat('x', 5001))$$,
                    '23514', 'a note over 5,000 characters is rejected');

set role authenticated;
select t.login('0a7e5000-0000-0000-0000-0000000000e1');
select t.denied($$select count(*) from public.contact_notes$$, 'members cannot read notes about themselves');
select t.denied($$insert into public.contact_notes (contact_id, body) values ('0a7e5000-0000-0000-0000-0000000000e1', 'hi')$$,
                'members cannot write notes');
reset role;
set role anon;
select t.denied($$select count(*) from public.contact_notes$$, 'anonymous visitors cannot read notes');
reset role;

delete from auth.users where id = '0a7e5000-0000-0000-0000-0000000000e2';
select t.ok((select author_id is null from public.contact_notes where contact_id = '0a7e5000-0000-0000-0000-0000000000e1'),
            'a deleted author keeps the note (author cleared)');
delete from auth.users where id = '0a7e5000-0000-0000-0000-0000000000e1';
select t.ok(not exists (select 1 from public.contact_notes where contact_id = '0a7e5000-0000-0000-0000-0000000000e1'),
            'notes are removed with the contact');
