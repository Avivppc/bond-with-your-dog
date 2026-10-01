-- Member depth: skill-level history (trigger, backfill, RLS), Q&A recording chapters, story photos.
-- Runs in a transaction so the fixtures don't leak into the other test files.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000b0001', 'depth-a@test.dev'),
  ('00000000-0000-0000-0000-0000000b0002', 'depth-b@test.dev');
insert into public.moves (id, slug, name, published) values
  ('b2000000-0000-0000-0000-000000000001', 'depth-spin', 'Spin', true),
  ('b2000000-0000-0000-0000-000000000002', 'depth-bow', 'Bow', true);
insert into public.dogs (id, owner_id, name) values
  ('b3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000b0001', 'Luna'),
  ('b3000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000b0002', 'Rex');

-- ── Backfill: skills that predate the trigger get one event each ──
alter table public.dog_skills disable trigger dog_skill_events_log;
insert into public.dog_skills (dog_id, move_id, level, set_by, updated_at) values
  ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002', 'reliable', 'member', '2026-09-01T10:00:00Z');
alter table public.dog_skills enable trigger dog_skill_events_log;
select t.ok(private.backfill_dog_skill_events() = 1, 'the backfill adds one event per existing skill');
select t.ok((select count(*) from public.dog_skill_events where dog_id = 'b3000000-0000-0000-0000-000000000001') = 1
            and (select from_level is null and to_level = 'reliable' and created_at = '2026-09-01T10:00:00Z'
                   from public.dog_skill_events where move_id = 'b2000000-0000-0000-0000-000000000002'),
            'a backfilled event starts from nothing and is dated by the skill''s last change');
select t.ok(private.backfill_dog_skill_events() = 0, 'the backfill is idempotent');

-- ── Trigger: every level change is logged, repeats are not ──
select t.login('00000000-0000-0000-0000-0000000b0001');
set role authenticated;
select public.set_dog_skill('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'learning');
select public.set_dog_skill('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'learning');
select public.set_dog_skill('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'reliable');
select t.ok((select count(*) from public.dog_skill_events where move_id = 'b2000000-0000-0000-0000-000000000001') = 2,
            'learning then reliable makes two events (setting the same level again adds none)');
select t.ok((select from_level = 'learning' and to_level = 'reliable' and set_by = 'member'
               from public.dog_skill_events where move_id = 'b2000000-0000-0000-0000-000000000001' order by id desc limit 1),
            'an update records the level it came from');
select t.denied($$insert into public.dog_skill_events (dog_id, move_id, to_level, set_by)
                  values ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'performance', 'coach')$$,
                'members cannot write history directly');
select t.denied($$delete from public.dog_skill_events$$, 'members cannot erase history');
reset role;

-- A coach upgrade (service role, as the Studio does) is logged as the coach's.
set role service_role;
insert into public.dog_skills (dog_id, move_id, level, set_by) values
  ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'performance', 'coach')
on conflict (dog_id, move_id) do update set level = excluded.level, set_by = excluded.set_by, updated_at = now();
reset role;
select t.ok(not has_table_privilege('service_role', 'public.dog_skill_events', 'update')
            and not has_table_privilege('service_role', 'public.dog_skill_events', 'delete'),
            'not even the service role rewrites history');
select t.ok((select set_by = 'coach' and from_level = 'reliable' and to_level = 'performance'
               from public.dog_skill_events where move_id = 'b2000000-0000-0000-0000-000000000001' order by id desc limit 1),
            'the Studio''s upgrade is logged as the coach''s');

-- ── RLS: owners read their own dog's history only ──
select t.login('00000000-0000-0000-0000-0000000b0002');
set role authenticated;
select public.set_dog_skill('b3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'learning');
select t.ok((select count(*) from public.dog_skill_events) = 1, 'a member sees only their own dog''s events');
reset role;
select t.login('00000000-0000-0000-0000-0000000b0001');
set role authenticated;
select t.ok((select count(*) from public.dog_skill_events where dog_id = 'b3000000-0000-0000-0000-000000000002') = 0, 'another member''s skill events stay hidden');
select t.ok((select count(*) from public.dog_skill_events) = 4, 'the owner sees all of their dog''s events');
reset role;

-- ── Recording chapters ──
insert into public.community_meetups (id, kind, title, starts_at) values
  ('b4000000-0000-0000-0000-000000000001', 'live_qa', 'Depth Q&A', now() - interval '3 days');
select t.ok((select recording_chapters = '[]'::jsonb from public.community_meetups where id = 'b4000000-0000-0000-0000-000000000001'), 'chapters default to none');
set role service_role;
update public.community_meetups set recording_chapters = '[{"t": 0, "title": "Welcome"}, {"t": 90, "title": "Loose-lead walking"}, {"t": 3725, "title": "Your questions"}]'
 where id = 'b4000000-0000-0000-0000-000000000001';
reset role;
select t.ok((select jsonb_array_length(recording_chapters) = 3 from public.community_meetups where id = 'b4000000-0000-0000-0000-000000000001'), 'staff save valid chapters');
select t.fails_with($$update public.community_meetups set recording_chapters = '[{"t": 90, "title": "B"}, {"t": 30, "title": "A"}]' where id = 'b4000000-0000-0000-0000-000000000001'$$,
                    '23514', 'chapters must be in time order');
select t.fails_with($$update public.community_meetups set recording_chapters = '[{"t": 30, "title": "A"}, {"t": 30, "title": "B"}]' where id = 'b4000000-0000-0000-0000-000000000001'$$,
                    '23514', 'two chapters cannot share a timestamp');
select t.fails_with($$update public.community_meetups set recording_chapters = '[{"t": -1, "title": "A"}]' where id = 'b4000000-0000-0000-0000-000000000001'$$,
                    '23514', 'no negative timestamps');
select t.fails_with($$update public.community_meetups set recording_chapters = '[{"t": 1.5, "title": "A"}]' where id = 'b4000000-0000-0000-0000-000000000001'$$,
                    '23514', 'whole seconds only');
select t.fails_with($$update public.community_meetups set recording_chapters = '[{"t": 36001, "title": "A"}]' where id = 'b4000000-0000-0000-0000-000000000001'$$,
                    '23514', 'no timestamps past 600 minutes');
select t.fails_with($$update public.community_meetups set recording_chapters = '[{"t": 5, "title": ""}]' where id = 'b4000000-0000-0000-0000-000000000001'$$,
                    '23514', 'titles cannot be empty');
select t.fails_with($$update public.community_meetups set recording_chapters = '[{"t": "5", "title": "A"}]' where id = 'b4000000-0000-0000-0000-000000000001'$$,
                    '23514', 'timestamps are numbers');
select t.fails_with($$update public.community_meetups set recording_chapters = '[{"t": 5, "title": "A", "x": 1}]' where id = 'b4000000-0000-0000-0000-000000000001'$$,
                    '23514', 'no extra keys');
select t.fails_with($$update public.community_meetups set recording_chapters = '{"t": 5}' where id = 'b4000000-0000-0000-0000-000000000001'$$,
                    '23514', 'chapters are a list');
select t.fails_with($$update public.community_meetups set recording_chapters = (select jsonb_agg(jsonb_build_object('t', n, 'title', 'C' || n)) from generate_series(1, 51) n) where id = 'b4000000-0000-0000-0000-000000000001'$$,
                    '23514', 'up to 50 chapters');
select t.ok(has_column_privilege('authenticated', 'public.community_meetups', 'recording_chapters', 'select'), 'members can read the chapters');

-- ── Story photos ──
select t.login('00000000-0000-0000-0000-0000000b0001');
set role authenticated;
select public.submit_support_request('story', 'Luna', 'Luna finally walks nicely on the lead!', '/community', true,
                                     array['00000000-0000-0000-0000-0000000b0001/stories/a1.jpg', '00000000-0000-0000-0000-0000000b0001/stories/b2.heic']);
select public.submit_support_request('bug', null, 'Video froze', '/learn/x', false);
select t.ok((select media_paths = array['00000000-0000-0000-0000-0000000b0001/stories/a1.jpg', '00000000-0000-0000-0000-0000000b0001/stories/b2.heic']
               from public.support_requests where subject = 'Luna'),
            'a story keeps its photos');
select t.ok((select media_paths = '{}' from public.support_requests where kind = 'bug'),
            'requests without photos still work (old call shape)');
select t.denied($$select public.submit_support_request('story', null, 'Someone else''s photos here', '/community', false,
                                                         array['00000000-0000-0000-0000-0000000b0002/stories/a1.jpg'])$$,
                'members cannot attach another member''s files');
select t.denied($$select public.submit_support_request('story', null, 'Sneaky path traversal attempt', '/community', false,
                                                         array['../00000000-0000-0000-0000-0000000b0001/stories/a1.jpg'])$$,
                'paths must start with the member''s own folder');
select t.fails_with($$select public.submit_support_request('story', null, 'Too many photos for one story', '/community', false,
                                                            array['00000000-0000-0000-0000-0000000b0001/stories/1.jpg', '00000000-0000-0000-0000-0000000b0001/stories/2.jpg',
                                                                  '00000000-0000-0000-0000-0000000b0001/stories/3.jpg', '00000000-0000-0000-0000-0000000b0001/stories/4.jpg'])$$,
                    '23514', 'up to 3 photos');
select t.fails_with($$select public.submit_support_request('story', null, 'Outside the stories folder', '/community', false,
                                                            array['00000000-0000-0000-0000-0000000b0001/stories/x/../../avatar.jpg'])$$,
                    '23514', 'photo names are plain file names in the stories folder');
select t.fails_with($$select public.submit_support_request('story', null, 'The same photo twice over', '/community', false,
                                                            array['00000000-0000-0000-0000-0000000b0001/stories/1.jpg', '00000000-0000-0000-0000-0000000b0001/stories/1.jpg'])$$,
                    '23514', 'no duplicate photos');
select t.fails_with($$select public.submit_support_request('bug', null, 'A bug with a photo attached', '/learn/x', false,
                                                            array['00000000-0000-0000-0000-0000000b0001/stories/1.jpg'])$$,
                    '22023', 'only stories take photos');
reset role;

-- Staff can't attach a path outside the member's folder either (the table checks it).
set role service_role;
insert into public.support_requests (user_id, kind, body, media_paths)
values ('00000000-0000-0000-0000-0000000b0001', 'story', 'Saved by staff', array['00000000-0000-0000-0000-0000000b0001/stories/staff.png']);
reset role;
select t.fails_with($$insert into public.support_requests (user_id, kind, body, media_paths)
                      values ('00000000-0000-0000-0000-0000000b0001', 'story', 'x', array['00000000-0000-0000-0000-0000000b0002/stories/a.jpg'])$$,
                    '23514', 'stored paths always belong to the request''s member');
select t.ok((select count(*) from public.admin_list_support_requests('story', null, 100, 0)
              where user_id = '00000000-0000-0000-0000-0000000b0001' and media_paths[1] like '00000000-0000-0000-0000-0000000b0001/stories/%') = 2,
            'the Inbox list includes the photos');

-- Deleting the member keeps the request (user_id set null) without tripping the photo check.
delete from auth.users where id = '00000000-0000-0000-0000-0000000b0001';
select t.ok((select count(*) from public.support_requests where user_id is null and cardinality(media_paths) > 0) = 2,
            'a deleted member''s story survives the path check');
select t.ok((select count(*) from public.dog_skill_events where dog_id = 'b3000000-0000-0000-0000-000000000001') = 0, 'history leaves with the dog');

rollback;
