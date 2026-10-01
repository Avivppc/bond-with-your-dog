-- Member app: dogs, skills, practice, questions, feedback, notifications, support, Q&A, routines, people.
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000d0001', 'maya@test.dev'),
  ('00000000-0000-0000-0000-0000000d0002', 'other@test.dev'),
  ('00000000-0000-0000-0000-0000000d0003', 'staff@test.dev');
insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-0000000d0001', 'Maya Levi'),
  ('00000000-0000-0000-0000-0000000d0002', 'Omer Other')
on conflict (id) do update set full_name = excluded.full_name;
insert into public.staff_members (user_id, role) values ('00000000-0000-0000-0000-0000000d0003', 'owner');

insert into public.courses (id, title, description, level, category, price, published) values
  ('ma-course', 'Member app course', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.lessons (id, course_id, title, position, published, kind) values
  ('d1000000-0000-0000-0000-000000000001', 'ma-course', 'Lesson one', 1, true, 'video');
insert into public.enrollments (user_id, course_id, source) values ('00000000-0000-0000-0000-0000000d0001', 'ma-course', 'grant');
insert into public.moves (id, slug, name, published) values
  ('d2000000-0000-0000-0000-000000000001', 'spin', 'Spin', true),
  ('d2000000-0000-0000-0000-000000000002', 'secret-move', 'Secret', false);

-- ── Dogs ──
select t.login('00000000-0000-0000-0000-0000000d0001');
set role authenticated;
insert into public.dogs (id, owner_id, name, breed) values ('d3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000d0001', 'Luna', 'Border Collie');
select t.denied($$insert into public.dogs (owner_id, name) values ('00000000-0000-0000-0000-0000000d0002', 'Not mine')$$, 'members add dogs only for themselves');
update public.profiles set active_dog_id = 'd3000000-0000-0000-0000-000000000001', goals = '{bond,dance}', onboarded_at = now()
 where id = '00000000-0000-0000-0000-0000000d0001';
select t.ok((select active_dog_id from public.profiles where id = '00000000-0000-0000-0000-0000000d0001') = 'd3000000-0000-0000-0000-000000000001', 'members pick their active dog');
select t.fails_with($$update public.profiles set goals = '{world_domination}' where id = '00000000-0000-0000-0000-0000000d0001'$$, '23514', 'goals come from the fixed list');
select t.ok((select dog_name from public.profiles where id = '00000000-0000-0000-0000-0000000d0001') = 'Luna', 'the profile mirrors the active dog''s name');
update public.dogs set name = 'Luna B' where id = 'd3000000-0000-0000-0000-000000000001';
select t.ok((select dog_name from public.profiles where id = '00000000-0000-0000-0000-0000000d0001') = 'Luna B', 'renaming the active dog updates the mirror');
update public.dogs set name = 'Luna' where id = 'd3000000-0000-0000-0000-000000000001';

select t.login('00000000-0000-0000-0000-0000000d0002');
select t.ok((select count(*) from public.dogs) = 0, 'other members do not see my dogs');
select t.fails_with($$update public.profiles set active_dog_id = 'd3000000-0000-0000-0000-000000000001' where id = '00000000-0000-0000-0000-0000000d0002'$$,
                    '42501', 'a dog that is not yours cannot be your active dog');

-- ── Moves + skills ──
select t.login('00000000-0000-0000-0000-0000000d0001');
select t.ok((select count(*) from public.moves) = 1, 'members see published moves only');
select public.set_dog_skill('d3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'reliable');
select t.ok((select level from public.dog_skills where move_id = 'd2000000-0000-0000-0000-000000000001') = 'reliable', 'members mark their dog''s level');
select t.fails_with($$select public.set_dog_skill('d3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'performance')$$,
                    '42501', 'performance-ready is set by Roni''s team only');
reset role;
update public.dog_skills set level = 'performance', set_by = 'coach' where move_id = 'd2000000-0000-0000-0000-000000000001';
set role authenticated;
select public.set_dog_skill('d3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'learning');
select t.ok((select level from public.dog_skills where move_id = 'd2000000-0000-0000-0000-000000000001') = 'performance', 'a coach''s level is not overwritten by the member');

-- ── Practice + achievements ──
insert into public.practice_sessions (user_id, dog_id, practiced_on, duration_seconds, reps)
select '00000000-0000-0000-0000-0000000d0001', 'd3000000-0000-0000-0000-000000000001', current_date - n, 600, 8 from generate_series(0, 5) n;
select t.ok((select count(*) from public.achievements where user_id = '00000000-0000-0000-0000-0000000d0001' and code in ('first_practice', 'rhythm_6')) = 2,
            'practice earns first-practice and the 6-day rhythm');
select t.ok((select count(*) from public.notifications where kind = 'achievement') >= 2, 'achievements arrive as notifications');
select t.denied($$insert into public.practice_sessions (user_id, duration_seconds) values ('00000000-0000-0000-0000-0000000d0002', 60)$$, 'sessions are logged only for yourself');

-- ── Lesson questions ──
select public.ask_lesson_question('d1000000-0000-0000-0000-000000000001', 'How long should we practice?');
select t.ok((select asker from public.lesson_questions_for('d1000000-0000-0000-0000-000000000001') limit 1) = 'Maya', 'questions show the asker''s first name');
select t.denied($$select * from public.lesson_questions$$, 'the questions table is not readable directly');
select t.login('00000000-0000-0000-0000-0000000d0002');
select t.fails_with($$select public.ask_lesson_question('d1000000-0000-0000-0000-000000000001', 'hi')$$, '42501', 'no questions without access to the lesson');
reset role;
update public.lesson_questions set answer = 'Five to ten minutes.', answered_at = now();
select t.ok(exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-0000000d0001' and kind = 'answer'), 'the asker is notified of the answer');

-- ── Video feedback ──
insert into public.feedback_videos (id, user_id, title, status) values ('d4000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000d0001', 'Spin', 'waiting');
insert into public.feedback_notes (video_id, at_seconds, body) values ('d4000000-0000-0000-0000-000000000001', 4, 'Lovely lure hand.');
update public.feedback_videos set status = 'replied', replied_at = now(), summary = 'Slow the cue down.' where id = 'd4000000-0000-0000-0000-000000000001';
select t.ok(exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-0000000d0001' and kind = 'feedback'), 'a reply notifies the member');
select t.ok(exists (select 1 from public.achievements where user_id = '00000000-0000-0000-0000-0000000d0001' and code = 'first_feedback'), 'and earns First feedback');
select t.login('00000000-0000-0000-0000-0000000d0001');
set role authenticated;
select t.ok((select count(*) from public.feedback_notes) = 1, 'members see notes on their own videos');
select public.reply_to_feedback('d4000000-0000-0000-0000-000000000001', 'Thank you!');
select public.mark_feedback_read('d4000000-0000-0000-0000-000000000001');
select t.ok((select member_read_at from public.feedback_videos where id = 'd4000000-0000-0000-0000-000000000001') is not null, 'reading feedback marks it read');
select public.mark_notifications_read(null);
select t.ok((select count(*) from public.notifications where read_at is null) = 0, 'mark all as read');
select t.login('00000000-0000-0000-0000-0000000d0002');
select t.ok((select count(*) from public.feedback_videos) = 0, 'other members do not see my videos');
select t.fails_with($$select public.reply_to_feedback('d4000000-0000-0000-0000-000000000001', 'sneaky')$$, '42501', 'nor reply on them');

-- ── Support ──
select public.submit_support_request('bug', null, 'The video froze', '/learn/x', false);
select t.ok((select count(*) from public.support_requests) = 1, 'members see their own requests');

-- ── Routines ──
select t.login('00000000-0000-0000-0000-0000000d0001');
insert into public.routines (user_id, name, music_path) values ('00000000-0000-0000-0000-0000000d0001', 'Sunday Waltz', '00000000-0000-0000-0000-0000000d0001/waltz.mp3');
select t.ok(exists (select 1 from public.achievements where user_id = '00000000-0000-0000-0000-0000000d0001' and code = 'first_routine'), 'a first routine earns its achievement');
select t.denied($$insert into public.routines (user_id, name, music_path) values ('00000000-0000-0000-0000-0000000d0001', 'x', 'someone-else/a.mp3')$$, 'music must be in your own folder');
reset role;

-- ── People (admin) ──
select t.ok(exists (select 1 from public.admin_list_people(null, 'team', 200, 0) where email = 'staff@test.dev')
            and not exists (select 1 from public.admin_list_people(null, 'team', 200, 0) where email = 'maya@test.dev'), 'team filter');
select t.ok((select dog_name from public.admin_list_people('maya@test.dev', 'all', 50, 0)) = 'Luna', 'search by email/name shows the active dog');
select t.ok((select count(*) from public.admin_list_people(null, 'students', 50, 0) where email = 'maya@test.dev') = 1, 'students filter');
