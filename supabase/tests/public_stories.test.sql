-- Visitors' stories from /stories/share: only the server saves them, photos must come from the same
-- upload session, one address sends at most 3 a day, and the Inbox shows who sent them.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into public.story_upload_tickets (path) values
  ('guest/11111111-1111-1111-1111-111111111111/stories/a1.jpg'),
  ('guest/22222222-2222-2222-2222-222222222222/stories/b1.jpg');

set role service_role;
select public.submit_visitor_story('Dana Levi', ' Dana@Example.com ', 'Dana & Rhythm', 'Rhythm learned to spin and we both smile more.', true,
                                   '11111111-1111-1111-1111-111111111111', array['guest/11111111-1111-1111-1111-111111111111/stories/a1.jpg'], '203.0.113.1');
select t.ok((select contact_email = 'dana@example.com' and user_id is null and kind = 'story' and consent_public and page_url = '/stories/share'
               from public.support_requests where contact_name = 'Dana Levi'), 'a visitor''s story is saved with who sent it');

-- Someone else's upload, or a path that was never uploaded through the form, is refused.
select t.denied($$select public.submit_visitor_story('Eve', 'eve@example.com', null, 'Trying to attach a photo that is not mine.', true,
                  '11111111-1111-1111-1111-111111111111', array['guest/22222222-2222-2222-2222-222222222222/stories/b1.jpg'], null)$$,
                'photos from another upload session are refused');
select t.denied($$select public.submit_visitor_story('Eve', 'eve@example.com', null, 'Trying to attach a photo that was never uploaded.', true,
                  '11111111-1111-1111-1111-111111111111', array['guest/11111111-1111-1111-1111-111111111111/stories/zz.jpg'], null)$$,
                'paths without an upload ticket are refused');

-- Three a day per address.
select public.submit_visitor_story('Dana Levi', 'dana@example.com', null, 'Second story about our progress together.', false, '11111111-1111-1111-1111-111111111111', '{}', null);
select public.submit_visitor_story('Dana Levi', 'dana@example.com', null, 'Third story about our progress together.', false, '11111111-1111-1111-1111-111111111111', '{}', null);
select t.fails_with($$select public.submit_visitor_story('Dana Levi', 'DANA@example.com', null, 'Fourth story about our progress together.', false,
                      '11111111-1111-1111-1111-111111111111', '{}', null)$$, '54000', 'an address sends at most 3 stories a day');

-- Five a day per internet address, whatever email is typed.
select public.submit_visitor_story('Eve', 'eve' || n || '@example.com', null, 'A story sent from one address many times.', true,
                                   '33333333-3333-3333-3333-333333333333', '{}', '198.51.100.9') from generate_series(1, 5) n;
select t.fails_with($$select public.submit_visitor_story('Eve', 'eve6@example.com', null, 'A story sent from one address many times.', true,
                      '33333333-3333-3333-3333-333333333333', '{}', '198.51.100.9')$$, '54000', 'one address sends at most 5 stories a day');

-- Upload tickets: only guest paths, 12 an hour per address.
select public.issue_story_upload_ticket('guest/44444444-4444-4444-4444-444444444444/stories/p' || n || '.jpg', '192.0.2.7') from generate_series(1, 12) n;
select t.fails_with($$select public.issue_story_upload_ticket('guest/44444444-4444-4444-4444-444444444444/stories/p13.jpg', '192.0.2.7')$$,
                    '54000', 'one address starts at most 12 uploads an hour');
select t.fails_with($$select public.issue_story_upload_ticket('00000000-0000-0000-0000-000000000001/stories/a.jpg', '192.0.2.8')$$,
                    '22023', 'tickets are only for visitor photo paths');

-- The clean-up lists day-old uploads no story uses, never the ones attached to a story.
reset role;
update public.story_upload_tickets set created_at = now() - interval '2 days'
 where path in ('guest/11111111-1111-1111-1111-111111111111/stories/a1.jpg', 'guest/22222222-2222-2222-2222-222222222222/stories/b1.jpg');
set role service_role;
select t.ok((select array_agg(p) = array['guest/22222222-2222-2222-2222-222222222222/stories/b1.jpg'] from public.stale_story_uploads(100) p),
            'only unused day-old uploads are cleaned up');

-- The Inbox shows the visitor's name and email.
select t.ok((select bool_and(email = 'dana@example.com' and full_name = 'Dana Levi')
               from public.admin_list_support_requests('story', null, 100, 0) where user_id is null and email = 'dana@example.com'),
            'the inbox lists the visitor by name and email');
reset role;

-- The table's rule holds even for direct writes: a visitor's row carries only guest photos.
select t.fails_with($$insert into public.support_requests (kind, body, contact_name, contact_email, media_paths)
                      values ('story', 'x', 'Eve', 'eve@example.com', array['00000000-0000-0000-0000-000000000001/stories/a.jpg'])$$,
                    '23514', 'a visitor story cannot point at a member''s photos');

-- Members and visitors can't call it or read the tickets.
set role authenticated;
select t.denied($$select public.submit_visitor_story('A', 'a@example.com', null, 'A story from the browser directly.', true, gen_random_uuid(), '{}', null)$$,
                'members cannot call it');
select t.denied($$select * from public.story_upload_tickets$$, 'members cannot read upload tickets');
reset role;
set role anon;
select t.denied($$select public.submit_visitor_story('A', 'a@example.com', null, 'A story from the browser directly.', true, gen_random_uuid(), '{}', null)$$,
                'visitors cannot call it from the browser');
reset role;

rollback;
