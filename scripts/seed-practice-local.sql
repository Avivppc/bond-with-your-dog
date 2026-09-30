-- Local-only demo data for the practice screens (Practice mode, Plan, Moves, Routine, Progress).
-- Idempotent: safe to run again. Never run against production.
--   psql postgresql://postgres:postgres@127.0.0.1:55622/postgres -f scripts/seed-practice-local.sql
-- Adds: published moves on the "kinetic-basics" lessons, practice steps on two of its lessons, and
-- a dog ("Luna") for student@bonded.test so the dog-specific screens have someone to show.
\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from auth.users where email = 'student@bonded.test') then
    raise exception 'refusing to seed: this does not look like the local database (no student@bonded.test)';
  end if;
  if not exists (select 1 from public.courses where id = 'kinetic-basics') then
    raise exception 'course kinetic-basics is missing: run scripts/seed-local.sh first';
  end if;
end $$;

-- Practice steps for two lessons of the course the student is enrolled in.
update public.lessons
   set practice_steps = '[
         {"title": "Follow the hand", "body": "Hold a treat at nose height and walk your hand slowly. Reward every few steps your dog stays with it.", "seconds": 60, "reps": 6},
         {"title": "Full circle lure", "body": "Draw a slow circle at nose height. Mark the moment the turn is complete and reward on the finish.", "seconds": 90, "reps": 8},
         {"title": "Add the cue", "body": "Say the cue once, pause a beat, then lure. Fade the lure a little each time.", "reps": 6}
       ]'::jsonb,
       practice_minutes = 8,
       cues = array['Spin']
 where id = '3ebf42f5-09ac-4f76-ba6b-f58021ce31f9';

update public.lessons
   set practice_steps = '[
         {"title": "Catch the look", "body": "Hold a treat at your eye line. Mark the moment your dog''s eyes meet yours, then reward away from your face.", "seconds": 60, "reps": 8},
         {"title": "Build duration", "body": "Wait one extra second before the mark. Keep it easy enough to win most reps.", "seconds": 90, "reps": 6}
       ]'::jsonb,
       practice_minutes = 5,
       cues = array['Look']
 where id = 'f6c5d6f8-b73d-45dd-873e-21b557f7a7f2';

insert into public.moves (slug, name, course_id, lesson_id, cue, summary, steps, image_url, loads_joints, gentle_alternative, position, published)
values
  ('eye-contact', 'Eye Contact', 'kinetic-basics', 'f6c5d6f8-b73d-45dd-873e-21b557f7a7f2', 'Look',
   'Hold a treat at your eye line. Mark the moment her eyes meet yours, then reward away from your face.',
   '["Treat at your eye line", "Mark the look", "Reward away from your face"]', '/app/img/basic-foundations.jpg', false, null, 1, true),
  ('hand-target', 'Hand Target', 'kinetic-basics', 'f6c5d6f8-b73d-45dd-873e-21b557f7a7f2', 'Touch',
   'Present a flat palm. Mark the nose touch and reward. Move the hand a little further each time.',
   '["Present a flat palm", "Mark the nose touch", "Move the hand further each time"]', '/app/img/basic-skills.jpg', false, null, 2, true),
  ('spin', 'Spin', 'kinetic-basics', '3ebf42f5-09ac-4f76-ba6b-f58021ce31f9', 'Spin',
   'Lure a slow circle at nose height. Pause one beat, add the cue, and reward on the finish.',
   '["Lure a slow circle at nose height", "Pause one beat, then add the cue", "Reward on the finish"]', '/app/img/artistic-impressions.jpg', false, null, 3, true),
  ('sit-pretty', 'Sit Pretty', 'kinetic-basics', '3ebf42f5-09ac-4f76-ba6b-f58021ce31f9', 'Pretty',
   'From a sit, lure the nose up and back. Reward the first lift of the front paws. Keep it short.',
   '["Start from a sit", "Lure the nose up and back", "Reward the first lift"]', '/app/img/basic-tricks.jpg', true,
   'Keep all four paws down: lure the nose up for a tall, proud sit and reward the stretch.', 4, true),
  ('calm-connection', 'Calm Connection', 'kinetic-basics', 'c7568462-a03f-457d-9778-bc84fc22fdeb', 'Settle',
   'Sit on the floor, breathe slowly and reward her for lying close. End every session here.',
   '["Sit on the floor", "Breathe slowly", "Reward lying close"]', '/app/img/give-a-hug.jpg', false, null, 5, true),
  ('bunny-hop', 'Bunny Hop', 'kinetic-basics', '2df3e168-92ba-47c8-a3d6-257b437146aa', 'Hop',
   'From sit pretty, lure slightly forward for one small hop.',
   '["Start from sit pretty", "Lure slightly forward", "Reward one small hop"]', '/app/img/drunk-bunny.jpg', true,
   'Skip the hop: practise a steady sit pretty with front paws resting on your arm.', 6, true)
on conflict (slug) do update
  set name = excluded.name, course_id = excluded.course_id, lesson_id = excluded.lesson_id, cue = excluded.cue,
      summary = excluded.summary, steps = excluded.steps, image_url = excluded.image_url,
      loads_joints = excluded.loads_joints, gentle_alternative = excluded.gentle_alternative,
      position = excluded.position, published = excluded.published;

-- A dog for the local student (only when they have none yet).
insert into public.dogs (owner_id, name, breed, age_group, size, limitations)
select u.id, 'Luna', 'Border Collie', 'adult', 'medium', array['joints']
  from auth.users u
 where u.email = 'student@bonded.test'
   and not exists (select 1 from public.dogs d where d.owner_id = u.id);

update public.profiles p
   set active_dog_id = (select d.id from public.dogs d where d.owner_id = p.id order by d.created_at limit 1)
 where p.id = (select id from auth.users where email = 'student@bonded.test')
   and p.active_dog_id is null;
