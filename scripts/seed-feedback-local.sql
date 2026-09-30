-- LOCAL ONLY sample data for the feedback screens (/feedback, /feedback/[id], /studio, /notifications,
-- /help). Idempotent: fixed ids, "on conflict" everywhere. Run with scripts/seed-feedback-local.sh.
-- Uses Mux's public sample playback id so the player works without Mux keys.
\set ON_ERROR_STOP 1
begin;

-- The student and Roni (owner) from scripts/seed-local.sh.
create temporary table seed_users on commit drop as
select (select id from auth.users where email = 'student@bonded.test') as student,
       (select id from auth.users where email = 'owner@bonded.test') as owner;

do $$
begin
  if (select student from seed_users) is null or (select owner from seed_users) is null then
    raise exception 'run scripts/seed-local.sh first (student@ and owner@bonded.test are missing)';
  end if;
end $$;

-- A dog for the student (only when they have none yet).
insert into public.dogs (id, owner_id, name, breed, age_group, size)
select 'fee00000-0000-4000-8000-000000000001', student, 'Luna', 'Border Collie', 'adult', 'medium' from seed_users
where not exists (select 1 from public.dogs d where d.owner_id = (select student from seed_users))
on conflict (id) do nothing;
update public.profiles set active_dog_id = (select id from public.dogs where owner_id = profiles.id order by created_at limit 1)
 where id = (select student from seed_users) and active_dog_id is null;

-- A move to talk about: an existing published one, else a sample linked to the student's course.
insert into public.moves (id, slug, name, course_id, lesson_id, cue, summary, published, position)
select 'fee00000-0000-4000-8000-000000000010', 'sample-spin', 'Spin', l.course_id, l.id, 'Spin',
       'Lure a slow circle at nose height. Pause one beat, add the cue, and reward on the finish.', true, 999
  from public.lessons l
 where l.course_id = 'kinetic-basics' and l.published
   and not exists (select 1 from public.moves where published and id <> 'fee00000-0000-4000-8000-000000000010')
 order by l.position limit 1
on conflict (id) do nothing;

create temporary table seed_ctx on commit drop as
select (select id from public.dogs where owner_id = (select student from seed_users) order by created_at limit 1) as dog,
       (select id from public.moves where published order by slug = 'spin' desc, position, created_at limit 1) as move,
       (select lesson_id from public.moves where published order by slug = 'spin' desc, position, created_at limit 1) as lesson,
       (select id from public.moves where published order by slug = 'sit-pretty' desc, position, created_at limit 1) as move2,
       (select lesson_id from public.moves where published order by slug = 'sit-pretty' desc, position, created_at limit 1) as lesson2;

-- 1) Replied: notes, summary, a coach level, a member reply.
insert into public.feedback_videos (id, user_id, dog_id, move_id, lesson_id, title, note, mux_playback_id, duration_seconds,
                                    status, summary, reviewed_by, replied_at, created_at)
select 'fee00000-0000-4000-8000-000000000101', u.student, c.dog, c.move, c.lesson,
       coalesce((select name from public.moves where id = c.move), 'Spin'), 'She hesitates to the right',
       'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M', 24, 'replied',
       'Beautiful rhythm. Now slow the cue down. Your lure is smooth and she is clearly enjoying it. Try the three notes below for a week, then send me another clip.',
       u.owner, now() - interval '2 hours', now() - interval '5 days'
  from seed_users u, seed_ctx c
on conflict (id) do update set move_id = excluded.move_id, lesson_id = excluded.lesson_id, title = excluded.title;
insert into public.feedback_notes (id, video_id, at_seconds, body, author_id)
select v.id, 'fee00000-0000-4000-8000-000000000101', v.at, v.body, (select owner from seed_users)
  from (values
    ('fee00000-0000-4000-8000-000000000201'::uuid, 4, 'Lovely. Your lure hand stays low and steady.'),
    ('fee00000-0000-4000-8000-000000000202'::uuid, 11, 'She anticipates here. Pause one beat before the cue.'),
    ('fee00000-0000-4000-8000-000000000203'::uuid, 19, 'Reward on the finish, not mid-turn, so the full circle pays.')
  ) as v(id, at, body)
on conflict (id) do nothing;
insert into public.feedback_messages (id, video_id, author_id, from_staff, body, created_at)
select 'fee00000-0000-4000-8000-000000000301', 'fee00000-0000-4000-8000-000000000101', student, false,
       'Thank you! Should I also try it off-lead?', now() - interval '1 hour'
  from seed_users
on conflict (id) do nothing;
insert into public.dog_skills (dog_id, move_id, level, set_by)
select dog, move, 'learning', 'coach' from seed_ctx where dog is not null and move is not null
on conflict (dog_id, move_id) do nothing;

-- 2) Waiting in Roni's queue.
insert into public.feedback_videos (id, user_id, dog_id, move_id, lesson_id, title, note, mux_playback_id, duration_seconds, status, created_at)
select 'fee00000-0000-4000-8000-000000000102', u.student, c.dog, c.move2, c.lesson2,
       coalesce((select name from public.moves where id = c.move2), 'Sit Pretty'), 'Is her back straight enough?',
       'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M', 24, 'waiting', now() - interval '3 days'
  from seed_users u, seed_ctx c
on conflict (id) do update set move_id = excluded.move_id, lesson_id = excluded.lesson_id, title = excluded.title;

-- Notifications across the three inbox groups.
insert into public.notifications (id, user_id, kind, title, body, href, created_at)
select n.id, u.student, n.kind, n.title, n.body, n.href, now() - n.age
  from seed_users u, (values
    ('fee00000-0000-4000-8000-000000000401'::uuid, 'feedback', 'Roni replied to your Spin video', '3 notes and a summary',
     '/feedback/fee00000-0000-4000-8000-000000000101', interval '2 hours'),
    ('fee00000-0000-4000-8000-000000000403'::uuid, 'support', 'Roni''s team replied', 'How often should we practise?', '/help', interval '12 days')
  ) as n(id, kind, title, body, href, age)
on conflict (id) do nothing;

-- A help request with the team's answer.
insert into public.support_requests (id, user_id, kind, subject, body, page_url, status, answer, answered_by, answered_at, created_at)
select 'fee00000-0000-4000-8000-000000000501', student, 'question', 'How often should we practise?',
       'How often should we practise the spin each week?', '/help', 'answered',
       'Three or four short sessions a week is plenty. Keep each one under ten minutes.', owner,
       now() - interval '12 days', now() - interval '13 days'
  from seed_users
on conflict (id) do nothing;

commit;
