-- Member area settings: one row, drafts save only on the latest revision, and only the service role
-- reads or writes them.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

select t.ok((select count(*) = 1 from public.member_area), 'there is exactly one member area row');
select t.fails_with($$ insert into public.member_area (id) values (2) $$, '23514', 'a second row is refused');

set role service_role;
create temp table rev as select draft_rev from public.member_area where id = 1;
select t.ok(public.save_member_area_draft((select draft_rev from rev), '{"home": {"welcomeBack": "Hi,"}}', null) = (select draft_rev + 1 from rev), 'a save on the latest revision goes through');
select t.ok(public.save_member_area_draft((select draft_rev from rev), '{}', null) is null, 'a stale save is refused');
select t.ok((select draft -> 'home' ->> 'welcomeBack' = 'Hi,' and has_changes from public.member_area), 'the refused save changed nothing');
reset role;

set role authenticated;
select t.denied($$ select * from public.member_area $$, 'members cannot read the settings directly');
select t.denied($$ select public.save_member_area_draft(1, '{}', null) $$, 'members cannot save');
reset role;

rollback;
