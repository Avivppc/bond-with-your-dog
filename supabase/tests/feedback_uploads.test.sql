-- Video feedback uploads: start_feedback_video checks and limits. Runs in a transaction so the
-- fixtures don't leak into the other test files.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f0001', 'fb-member@test.dev'),
  ('00000000-0000-0000-0000-0000000f0002', 'fb-other@test.dev');
insert into public.courses (id, title, description, level, category, price, published) values
  ('fb-course', 'Feedback course', 'd', 'Beginner', 'Foundations', 0, true),
  ('fb-locked', 'Locked course', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.lessons (id, course_id, title, position, published, kind) values
  ('fb100000-0000-0000-0000-000000000001', 'fb-course', 'Your First Spin', 1, true, 'video'),
  ('fb100000-0000-0000-0000-000000000002', 'fb-locked', 'Not yours', 1, true, 'video');
insert into public.enrollments (user_id, course_id, source) values ('00000000-0000-0000-0000-0000000f0001', 'fb-course', 'grant');
insert into public.moves (id, slug, name, published) values
  ('fb200000-0000-0000-0000-000000000001', 'fb-spin', 'Spin', true),
  ('fb200000-0000-0000-0000-000000000002', 'fb-draft', 'Draft move', false);
insert into public.dogs (id, owner_id, name) values
  ('fb300000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000f0001', 'Luna'),
  ('fb300000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000f0002', 'Rex');

select t.login('00000000-0000-0000-0000-0000000f0001');
set role authenticated;

select t.ok(public.start_feedback_video('fb300000-0000-0000-0000-000000000001', 'fb200000-0000-0000-0000-000000000001',
                                        'fb100000-0000-0000-0000-000000000001', null, '  She hesitates to the right  ') is not null,
            'members start a feedback video for their own dog');
select t.ok((select title from public.feedback_videos where user_id = '00000000-0000-0000-0000-0000000f0001') = 'Spin',
            'the title comes from the move when none is given');
select t.ok((select note from public.feedback_videos where user_id = '00000000-0000-0000-0000-0000000f0001') = 'She hesitates to the right',
            'the note is trimmed');
select t.ok((select status from public.feedback_videos where user_id = '00000000-0000-0000-0000-0000000f0001') = 'uploading',
            'new videos start as uploading');

select public.start_feedback_video(null, null, 'fb100000-0000-0000-0000-000000000001', '', null);
select t.ok(exists (select 1 from public.feedback_videos where title = 'Your First Spin'), 'the title falls back to the lesson');

select t.denied($$select public.start_feedback_video('fb300000-0000-0000-0000-000000000002', null, null, 'x', null)$$,
                'a dog that is not yours cannot be sent');
select t.fails_with($$select public.start_feedback_video(null, 'fb200000-0000-0000-0000-000000000002', null, 'x', null)$$,
                    '22023', 'unpublished moves cannot be picked');
select t.denied($$select public.start_feedback_video(null, null, 'fb100000-0000-0000-0000-000000000002', 'x', null)$$,
                'lessons the member cannot open cannot be picked');
select t.denied($$insert into public.feedback_videos (user_id, title) values ('00000000-0000-0000-0000-0000000f0001', 'direct')$$,
                'members cannot insert feedback rows directly');
update public.feedback_videos set status = 'replied' where user_id = '00000000-0000-0000-0000-0000000f0001';
select t.ok(not exists (select 1 from public.feedback_videos where status = 'replied'), 'members cannot change a video''s status');

select public.start_feedback_video(null, null, null, 'three', null);
select public.start_feedback_video(null, null, null, 'four', null);
select public.start_feedback_video(null, null, null, 'five', null);
select t.fails_with($$select public.start_feedback_video(null, null, null, 'six', null)$$, '54000', 'five videos a day at most');

select t.login('00000000-0000-0000-0000-0000000f0002');
select t.ok((select count(*) from public.feedback_videos) = 0, 'other members do not see my videos');

reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
select t.denied($$select public.start_feedback_video(null, null, null, 'anon', null)$$, 'signed-out visitors cannot start uploads');
reset role;

rollback;
