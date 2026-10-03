-- Website editor: drafts save only on the latest revision, built-in pages keep their address,
-- addresses are unique, and visitors and members can't read or write any of it directly.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

set role service_role;
insert into public.site_pages (id, slug, title, system_key) values ('5e000000-0000-0000-0000-000000000001', 'about', 'About', 'about');
insert into public.site_pages (id, slug, title) values ('5e000000-0000-0000-0000-000000000002', 'workshop', 'Workshop');

select t.ok(public.save_site_page_draft('5e000000-0000-0000-0000-000000000002', 1, '{"sections": [], "assistant": true}', '{"title": "", "description": "", "image": ""}', 'Workshop 2027', 'workshop-2027', null) = 2,
            'a save on the latest revision goes through and bumps it');
select t.ok(public.save_site_page_draft('5e000000-0000-0000-0000-000000000002', 1, '{"sections": [], "assistant": false}', '{}', 'Stale', 'stale', null) is null,
            'a save from a stale editor is refused');
select t.ok((select title = 'Workshop 2027' and slug = 'workshop-2027' and has_changes from public.site_pages where id = '5e000000-0000-0000-0000-000000000002'),
            'the refused save changed nothing');
select t.ok(public.save_site_page_draft('5e000000-0000-0000-0000-000000000001', 1, '{"sections": [], "assistant": false}', '{}', 'About Roni', 'somewhere-else', null) = 2, 'built-in pages save');
select t.ok((select slug = 'about' from public.site_pages where id = '5e000000-0000-0000-0000-000000000001'), 'but keep their address');
select t.fails_with($$ insert into public.site_pages (slug, title) values ('workshop-2027', 'Copy') $$, '23505', 'two pages cannot share an address');
select t.fails_with($$ insert into public.site_pages (slug, title) values ('Bad Slug', 'Bad') $$, '23514', 'addresses are lowercase words and dashes');
select t.ok(public.save_site_theme_draft(1, '{"logo": "/x.png"}', null) = 2, 'the theme draft saves on the latest revision');
select t.ok(public.save_site_theme_draft(1, '{}', null) is null, 'and refuses a stale one');
reset role;

set role anon;
select t.denied($$ select * from public.site_pages $$, 'visitors cannot read pages directly');
select t.denied($$ select public.save_site_page_draft('5e000000-0000-0000-0000-000000000002', 2, '{}', '{}', 'x', 'x', null) $$, 'visitors cannot save drafts');
reset role;
set role authenticated;
select t.denied($$ update public.site_theme set published = '{}' $$, 'members cannot change the theme');
reset role;

rollback;
