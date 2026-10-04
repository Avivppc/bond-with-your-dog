-- Settings → General is public to read but only the service role writes it; notification prefs default sensibly.
\set ON_ERROR_STOP 1
begin;

select t.ok((select count(*) = 1 from public.site_settings), 'there is exactly one site settings row');
select t.fails_with($$ insert into public.site_settings (id) values (2) $$, '23514', 'a second settings row is refused');
select t.fails_with($$ update public.site_settings set contact_email = 'not-an-email' where id = 1 $$, '23514', 'the contact email must look like one');
select t.ok((select notify ->> 'orders' = 'true' and notify ->> 'leads' = 'false' from public.email_settings where id = 1),
            'purchases notify the team by default, quiz leads do not');

-- Business details for the legal pages start empty and are bounded.
select t.ok((select legal_name = '' and business_number = '' and business_address = '' and business_phone = '' from public.site_settings where id = 1),
            'the business details start empty');
select t.fails_with($$ update public.site_settings set business_number = repeat('1', 41) where id = 1 $$, '23514', 'a business number is capped at 40 characters');

set role anon;
select t.ok((select academy_name is not null from public.site_settings where id = 1), 'visitors can read the site settings');
select t.denied($$ update public.site_settings set academy_name = 'Hacked' where id = 1 $$, 'visitors cannot change the site settings');
reset role;

set role authenticated;
select t.denied($$ update public.site_settings set contact_email = 'x@evil.dev' where id = 1 $$, 'members cannot change the site settings');
reset role;

rollback;
