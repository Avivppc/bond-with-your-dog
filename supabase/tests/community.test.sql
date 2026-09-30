-- Community: access, posting rules, moderation states, comments, likes, polls, challenges,
-- meetups and points.
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000c0001', 'member@test.dev'),
  ('00000000-0000-0000-0000-0000000c0002', 'outsider@test.dev'),
  ('00000000-0000-0000-0000-0000000c0003', 'club-buyer@test.dev'),
  ('00000000-0000-0000-0000-0000000c0004', 'other-member@test.dev');
insert into public.profiles (id, full_name, dog_name) values
  ('00000000-0000-0000-0000-0000000c0001', 'Maya Member', 'Rex'),
  ('00000000-0000-0000-0000-0000000c0004', 'Omer Other', null)
on conflict (id) do update set full_name = excluded.full_name, dog_name = excluded.dog_name;

insert into public.courses (id, title, description, level, category, price, published) values
  ('cm-course', 'Community course', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.enrollments (user_id, course_id, source) values
  ('00000000-0000-0000-0000-0000000c0001', 'cm-course', 'grant'),
  ('00000000-0000-0000-0000-0000000c0004', 'cm-course', 'grant');
insert into public.offers (id, slug, title, payment_type, price_cents, currency, status, includes_community) values
  ('c0000000-0000-0000-0000-000000000001', 'cm-club', 'Club', 'free', 0, 'USD', 'published', true);

-- ── Access ──
select t.login('00000000-0000-0000-0000-0000000c0001');
select t.ok(public.can_access_community(), 'students with an active course are members');
select t.login('00000000-0000-0000-0000-0000000c0002');
select t.ok(not public.can_access_community(), 'people without access are not');
select t.fails_with($$select public.community_create_post((select id from public.community_channels where slug = 'general'), null, null, 'hi', null, null)$$,
                    '42501', 'non-members cannot post');

select public.grant_offer_access('00000000-0000-0000-0000-0000000c0003', 'c0000000-0000-0000-0000-000000000001', 'grant', null, null);
select t.login('00000000-0000-0000-0000-0000000c0003');
select t.ok(public.can_access_community(), 'an offer that includes the community grants access');
select public.revoke_offer_access('00000000-0000-0000-0000-0000000c0003', 'c0000000-0000-0000-0000-000000000001', null);
select t.ok(not public.can_access_community(), 'revoking the offer removes community access');

-- ── Posting ──
select t.login('00000000-0000-0000-0000-0000000c0001');
select public.community_create_post((select id from public.community_channels where slug = 'general'), null, 'Hello', 'First post!', null, null);
select t.ok((select status from public.community_posts where title = 'Hello') = 'published', 'member posts go live');
select t.ok((select sum(points) from public.community_points where user_id = '00000000-0000-0000-0000-0000000c0001' and reason = 'post') = 1, 'a post earns a point');
select t.fails_with($$select public.community_create_post((select id from public.community_channels where slug = 'announcements'), null, null, 'nope', null, null)$$,
                    '42501', 'announcements are staff-only');
select t.fails_with($$select public.community_create_post((select id from public.community_channels where slug = 'general'), null, null, 'x', 'someone-else/pic.jpg', null)$$,
                    '42501', 'images must come from your own upload folder');
select t.fails_with($$select public.community_create_post((select id from public.community_channels where slug = 'general'), null, null, 'poll', null, '["only one"]'::jsonb)$$,
                    '22023', 'polls need 2 to 6 options');

-- Daily cap: posting a lot earns at most 5 post points per day.
select public.community_create_post((select id from public.community_channels where slug = 'general'), null, null, 'spam ' || n, null, null) from generate_series(1, 6) n;
select t.ok((select sum(points) from public.community_points where user_id = '00000000-0000-0000-0000-0000000c0001' and reason = 'post') = 5, 'post points are capped per day');

-- Approval required → pending, invisible to others.
update public.community_settings set require_approval = true;
select public.community_create_post((select id from public.community_channels where slug = 'general'), null, 'Needs review', 'please approve', null, null);
select t.ok((select status from public.community_posts where title = 'Needs review') = 'pending', 'with approval on, posts wait for review');
update public.community_settings set require_approval = false;
set role authenticated;
select t.ok((select count(*) from public.community_posts where title = 'Needs review') = 1, 'authors see their pending posts');
select t.login('00000000-0000-0000-0000-0000000c0004');
select t.ok((select count(*) from public.community_posts where title = 'Needs review') = 0, 'others do not');
select t.denied($$insert into public.community_posts (author_id, body) values ('00000000-0000-0000-0000-0000000c0004', 'direct')$$, 'no direct writes');
reset role;

-- Scheduled posts appear at their time.
insert into public.community_posts (channel_id, author_id, title, body, status, publish_at) values
  ((select id from public.community_channels where slug = 'general'), '00000000-0000-0000-0000-0000000c0001', 'Later', 'soon', 'scheduled', now() + interval '1 day'),
  ((select id from public.community_channels where slug = 'general'), '00000000-0000-0000-0000-0000000c0001', 'Due', 'now', 'scheduled', now() - interval '1 minute');
set role authenticated;
select t.ok((select count(*) from public.community_posts where title = 'Later') = 0 and (select count(*) from public.community_posts where title = 'Due') = 1,
            'scheduled posts go live at their publish time');
reset role;

-- ── Comments ──
select t.login('00000000-0000-0000-0000-0000000c0004');
select public.community_add_comment((select id from public.community_posts where title = 'Hello'), null, 'Welcome!');
select public.community_add_comment((select id from public.community_posts where title = 'Hello'), (select id from public.community_comments where body = 'Welcome!'), 'Thanks');
select t.ok((select comment_count from public.community_posts where title = 'Hello') = 2, 'comment counter follows comments and replies');
select t.fails_with($$select public.community_add_comment((select id from public.community_posts where title = 'Hello'), (select id from public.community_comments where body = 'Thanks'), 'deep')$$,
                    '22023', 'replies are one level deep');
update public.community_posts set comments_locked = true where title = 'Hello';
select t.fails_with($$select public.community_add_comment((select id from public.community_posts where title = 'Hello'), null, 'late')$$, '42501', 'locked posts take no comments');
update public.community_posts set comments_locked = false where title = 'Hello';

-- ── Likes (no point farming by re-liking) ──
select t.ok(public.community_toggle_like((select id from public.community_posts where title = 'Hello'), null), 'like');
select t.ok(not public.community_toggle_like((select id from public.community_posts where title = 'Hello'), null), 'unlike');
select public.community_toggle_like((select id from public.community_posts where title = 'Hello'), null);
select t.ok((select like_count from public.community_posts where title = 'Hello') = 1, 'like counter');
select t.ok((select count(*) from public.community_points where user_id = '00000000-0000-0000-0000-0000000c0001' and reason = 'like_received') = 1,
            'the author earns once per liker');

-- ── Polls ──
select t.login('00000000-0000-0000-0000-0000000c0001');
select public.community_create_post((select id from public.community_channels where slug = 'general'), null, 'Poll', 'Pick one', null, '["Sit", "Spin"]'::jsonb);
select public.community_vote((select id from public.community_posts where title = 'Poll'), 0);
select public.community_vote((select id from public.community_posts where title = 'Poll'), 1);
select t.ok((select votes from public.community_poll_counts(array[(select id from public.community_posts where title = 'Poll')]) where option_index = 1) = 1,
            'changing a vote moves it');
select t.fails_with($$select public.community_vote((select id from public.community_posts where title = 'Poll'), 5)$$, '22023', 'votes must pick an option');

-- ── Challenges ──
insert into public.community_challenges (id, title, starts_at, ends_at, points, published) values
  ('c1000000-0000-0000-0000-000000000001', '7-day focus', now() - interval '1 day', now() + interval '6 days', 100, true);
insert into public.community_challenge_steps (id, challenge_id, position, title) values
  ('c1100000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 1, 'Day 1'),
  ('c1100000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 2, 'Day 2');
select public.community_join_challenge('c1000000-0000-0000-0000-000000000001');
select public.community_complete_step('c1100000-0000-0000-0000-000000000001', true);
select t.ok((select completed_at from public.community_challenge_participants where user_id = '00000000-0000-0000-0000-0000000c0001') is null, 'not done after one step');
select public.community_complete_step('c1100000-0000-0000-0000-000000000002', true);
select t.ok((select completed_at from public.community_challenge_participants where user_id = '00000000-0000-0000-0000-0000000c0001') is not null, 'done after every step');
select t.ok((select points from public.community_points where user_id = '00000000-0000-0000-0000-0000000c0001' and reason = 'challenge_completed') = 100,
            'completing a challenge earns its points');

-- ── Meetups ──
insert into public.community_meetups (id, title, starts_at) values ('c2000000-0000-0000-0000-000000000001', 'Live Q&A', now() + interval '2 days');
select public.community_rsvp('c2000000-0000-0000-0000-000000000001', true);
select public.community_rsvp('c2000000-0000-0000-0000-000000000001', false);
select public.community_rsvp('c2000000-0000-0000-0000-000000000001', true);
select t.ok((select count(*) from public.community_rsvps where meetup_id = 'c2000000-0000-0000-0000-000000000001') = 1, 'one RSVP per member');
select t.ok((select sum(points) from public.community_points where user_id = '00000000-0000-0000-0000-0000000c0001' and reason = 'rsvp') = 25, 'RSVP points once');

-- ── Leaderboard & profiles ──
select t.ok((select user_id from public.community_leaderboard(now() - interval '1 day', 10) limit 1) = '00000000-0000-0000-0000-0000000c0001', 'most points first');
select t.ok((select full_name from public.community_profiles(array['00000000-0000-0000-0000-0000000c0004'::uuid])) = 'Omer Other', 'members see each other''s public profile');
select t.login('00000000-0000-0000-0000-0000000c0002');
select t.ok((select count(*) from public.community_profiles(array['00000000-0000-0000-0000-0000000c0004'::uuid])) = 0, 'outsiders see no profiles');

-- ── Removal ──
select t.login('00000000-0000-0000-0000-0000000c0004');
select t.fails_with($$select public.community_delete_post((select id from public.community_posts where title = 'Hello'))$$, '42501', 'members cannot delete other people''s posts');
select t.login('00000000-0000-0000-0000-0000000c0001');
select public.community_delete_post((select id from public.community_posts where title = 'Hello'));
select t.ok((select status from public.community_posts where title = 'Hello') = 'removed', 'authors can delete their posts');

-- ── Profile points ──
select t.login('00000000-0000-0000-0000-0000000c0004');
select t.ok(public.community_member_points('00000000-0000-0000-0000-0000000c0001') > 0, 'members see each other''s points');
select t.login('00000000-0000-0000-0000-0000000c0002');
select t.ok(public.community_member_points('00000000-0000-0000-0000-0000000c0001') is null, 'outsiders do not');

-- ── Review fixes: drafts, meeting links, time windows, approval points ──
insert into public.community_challenges (id, title, starts_at, ends_at, points, published) values
  ('c1000000-0000-0000-0000-000000000002', 'Secret draft', now(), now() + interval '7 days', 50, false),
  ('c1000000-0000-0000-0000-000000000003', 'Finished', now() - interval '10 days', now() - interval '3 days', 50, true);
insert into public.community_challenge_steps (id, challenge_id, position, title) values
  ('c1100000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 1, 'Hidden step'),
  ('c1100000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003', 1, 'Old step');
insert into public.community_meetups (id, title, starts_at, meeting_url) values
  ('c2000000-0000-0000-0000-000000000002', 'Later call', now() + interval '2 days', 'https://zoom.us/j/1'),
  ('c2000000-0000-0000-0000-000000000003', 'Soon call', now() + interval '5 minutes', 'https://zoom.us/j/2'),
  ('c2000000-0000-0000-0000-000000000004', 'Old call', now() - interval '3 days', 'https://zoom.us/j/3');
select id as hello_id from public.community_posts where title = 'Hello' \gset

select t.login('00000000-0000-0000-0000-0000000c0004');
set role authenticated;
select t.ok((select count(*) from public.community_challenge_steps where title = 'Hidden step') = 0, 'steps of draft challenges are hidden');
select t.ok((select count(*) from public.community_challenge_steps where title = 'Old step') = 1, 'steps of published challenges are visible');
select t.denied($$select meeting_url from public.community_meetups$$, 'meeting links are not readable directly');
select t.ok((select has_meeting_link from public.community_meetups where id = 'c2000000-0000-0000-0000-000000000002'), 'pages can tell a link exists');
select t.ok(public.community_meetup_link('c2000000-0000-0000-0000-000000000002') is null, 'no link days before the start');
select t.ok(public.community_meetup_link('c2000000-0000-0000-0000-000000000003') = 'https://zoom.us/j/2', 'the link opens 15 minutes before the start');
select t.ok(public.community_meetup_link('c2000000-0000-0000-0000-000000000004') is null, 'no link after the end');
select t.fails_with($$select public.community_rsvp('c2000000-0000-0000-0000-000000000004', true)$$, '22023', 'no RSVP (or points) for past meetups');
select t.fails_with($$select public.community_join_challenge('c1000000-0000-0000-0000-000000000003')$$, '22023', 'ended challenges cannot be joined');
select t.fails_with($$select public.community_complete_step('c1100000-0000-0000-0000-000000000004', true)$$, '22023', 'no step points after a challenge ends');
select t.ok((select count(*) from public.community_comments where post_id = :'hello_id') = 0, 'comments on a removed post are hidden');
select t.login('00000000-0000-0000-0000-0000000c0002');
select t.ok(public.community_meetup_link('c2000000-0000-0000-0000-000000000003') is null, 'outsiders never get the link');
reset role;

update public.community_settings set require_approval = true;
select t.login('00000000-0000-0000-0000-0000000c0004');
select public.community_create_post((select id from public.community_channels where slug = 'general'), null, 'Approve me', 'waiting', null, null);
select t.ok(not exists (select 1 from public.community_points p join public.community_posts cp on p.source_id = cp.id::text
                         where cp.title = 'Approve me' and p.reason = 'post'), 'a pending post earns nothing yet');
update public.community_posts set status = 'published', publish_at = now() where title = 'Approve me';
select t.ok(exists (select 1 from public.community_points p join public.community_posts cp on p.source_id = cp.id::text
                     where cp.title = 'Approve me' and p.reason = 'post' and p.user_id = '00000000-0000-0000-0000-0000000c0004'),
            'approving a post awards its author');
update public.community_settings set require_approval = false;
