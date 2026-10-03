-- Importing contacts: email-only people are stored with their consent and tags, members keep their
-- account, campaigns reach email-only contacts by consent, and only the service role can do any of it.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000c1001', 'import-member@test.dev');
insert into public.profiles (id, full_name, marketing_opt_in) values ('00000000-0000-0000-0000-0000000c1001', null, false)
on conflict (id) do update set full_name = null, marketing_opt_in = false;

set role service_role;
create temp table dbg as select * from public.admin_import_contacts($$[
                 {"email": "Fan@Test.dev", "name": "Fan One", "subscribed": true, "tags": ["kajabi", "vip"]},
                 {"email": "quiet@test.dev", "subscribed": false, "tags": ["kajabi"]},
                 {"email": "import-member@test.dev", "name": "Mem Ber", "subscribed": true, "tags": ["kajabi"]},
                 {"email": "not-an-email", "tags": ["kajabi"]},
                 {"email": "fan@test.dev", "tags": ["Bad Tag!"]}
               ]$$::jsonb, null);
select t.ok((select contacts_created = 2 and contacts_updated = 0 and members_matched = 1 and tags_added = 4 from dbg),
            'two email-only contacts, one member, four valid tags; bad emails and tags are skipped: ' || (select row(d.*)::text from dbg d));
select t.ok((select marketing_opt_in and full_name = 'Fan One' from public.contacts where lower(email) = 'fan@test.dev'), 'consent and name are stored');
select t.ok((select marketing_opt_in and full_name = 'Mem Ber' from public.profiles where id = '00000000-0000-0000-0000-0000000c1001'),
            'a member is subscribed and named from the import, without a contacts row');
select t.ok(not exists (select 1 from public.contacts where lower(email) = 'import-member@test.dev'), 'members are not copied into contacts');

-- Importing again updates, and a missing "subscribed" keeps what was there.
select t.ok((select contacts_created = 0 and contacts_updated = 1 and tags_added = 0
               from public.admin_import_contacts($$[{"email": "fan@test.dev", "tags": ["vip"]}]$$::jsonb, null)),
            'a second import updates instead of duplicating');
select t.ok((select marketing_opt_in and full_name = 'Fan One' from public.contacts where lower(email) = 'fan@test.dev'),
            'without a subscribed value or a name, the earlier ones stay');

-- Campaigns: email-only contacts are leads, reached by consent.
select t.ok(exists (select 1 from public.campaign_audience('{"kind": "quiz_leads"}') where lower(email) = 'fan@test.dev'), 'a subscribed contact is in the leads audience');
select t.ok(not exists (select 1 from public.campaign_audience('{"kind": "quiz_leads"}') where lower(email) = 'quiet@test.dev'), 'an unsubscribed contact is not');
select t.ok(exists (select 1 from public.campaign_audience('{"kind": "quiz_leads", "consent": "all"}') where lower(email) = 'quiet@test.dev'),
            'emailing everyone reaches them too');
select t.ok(exists (select 1 from public.campaign_audience('{"kind": "has_tag", "tag": "vip"}') where lower(email) = 'fan@test.dev'), 'tags from the import work in audiences');

select t.ok((select count(*) = 2 from public.admin_list_email_contacts('', 50, 0) where lower(email) in ('fan@test.dev', 'quiet@test.dev')), 'the leads page lists them');
select t.ok((select tags = array['kajabi', 'vip'] from public.admin_list_email_contacts('fan', 50, 0)), 'with their tags');
select t.ok((select count(*) = 1 from public.admin_export_contacts() where kind = 'email only' and lower(email) = 'fan@test.dev'), 'export includes email-only contacts');
select t.ok((select kind = 'member' and tags = 'kajabi' from public.admin_export_contacts() where email = 'import-member@test.dev'), 'export includes members with tags');
select t.fails_with($$ select * from public.admin_import_contacts((select jsonb_agg(jsonb_build_object('email', 'x' || g || '@t.dev')) from generate_series(1, 501) g), null) $$,
                    '22023', 'a batch over 500 rows is refused');
reset role;

set role authenticated;
select t.denied($$ select * from public.admin_import_contacts('[]'::jsonb, null) $$, 'members cannot import');
select t.denied($$ select * from public.admin_export_contacts() $$, 'members cannot export');
select t.denied($$ select * from public.contacts $$, 'members cannot read contacts');
reset role;

rollback;
