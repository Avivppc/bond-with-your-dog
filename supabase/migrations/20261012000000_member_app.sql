-- ============================================================
-- Bonded Member App (the design in docs/member-app/spec.md)
--   1. Profiles: onboarding answers, practice preferences, active dog
--   2. Dogs (several per member, each with its own progress)
--   3. Moves library + each dog's skill level per move
--   4. Lesson / course extras: takeaways, cues, practice steps, "what you'll need", chapter order
--   5. Practice sessions and the weekly plan
--   6. Lesson questions (the "Questions" tab)
--   7. Video feedback from Roni (videos, pinned notes, replies)
--   8. Notifications
--   9. Support requests (Ask Roni / report a problem / share a story)
--  10. Live Q&A: questions sent ahead, recordings, WhatsApp link
--  11. Routines (Let's Dance routine builder)
--  12. Achievements for the new milestones
--  13. Storage buckets for photos and routine music
--  14. Admin "People" list
-- Member writes that need checks go through SECURITY DEFINER RPCs; plain own-row data
-- (dogs, sessions, plan, routines) uses RLS with owner checks. Staff use the service role.
-- Tests: supabase/tests/member_app.test.sql
-- ============================================================

-- ── 2. Dogs (created first: profiles.active_dog_id references it) ──
create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  breed text check (char_length(breed) <= 80),
  age_group text not null default 'adult' check (age_group in ('puppy', 'adult', 'senior')),
  size text check (size in ('small', 'medium', 'large')),
  limitations text[] not null default '{}' check (limitations <@ array['joints', 'injury', 'other']::text[]),
  limitation_note text check (char_length(limitation_note) <= 200),
  photo_url text check (photo_url is null or photo_url ~ '^https?://'),
  created_at timestamptz not null default now()
);
create index if not exists dogs_owner on public.dogs (owner_id, created_at);
alter table public.dogs enable row level security;
drop policy if exists dogs_own on public.dogs;
create policy dogs_own on public.dogs for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- A member may keep up to 10 dogs.
create or replace function private.dogs_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.dogs where owner_id = new.owner_id) >= 10 then
    raise exception 'you can add up to 10 dogs' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists dogs_limit on public.dogs;
create trigger dogs_limit before insert on public.dogs for each row execute function private.dogs_limit();

-- ── 1. Profiles ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists onboarded_at timestamptz,
  add column if not exists goals text[] not null default '{}',
  add column if not exists session_minutes int not null default 10,
  add column if not exists practice_days smallint[] not null default '{1,3,6}',
  add column if not exists active_dog_id uuid references public.dogs(id) on delete set null,
  add column if not exists tours_seen text[] not null default '{}';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_goals_check') then
    alter table public.profiles add constraint profiles_goals_check
      check (goals <@ array['bond', 'tricks', 'dance', 'calm', 'job', 'perform']::text[]);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_session_minutes_check') then
    alter table public.profiles add constraint profiles_session_minutes_check check (session_minutes in (5, 10, 15));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_practice_days_check') then
    alter table public.profiles add constraint profiles_practice_days_check
      check (practice_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]);
  end if;
end $$;

-- The active dog must belong to the member.
create or replace function private.profiles_active_dog()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.active_dog_id is not null
     and not exists (select 1 from public.dogs where id = new.active_dog_id and owner_id = new.id) then
    raise exception 'that dog is not yours' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_active_dog on public.profiles;
create trigger profiles_active_dog before insert or update of active_dog_id on public.profiles
  for each row execute function private.profiles_active_dog();

-- ── 3. Moves library + skills ───────────────────────────────
create table if not exists public.moves (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  course_id text references public.courses(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  cue text check (char_length(cue) <= 120),
  summary text check (char_length(summary) <= 600),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  video_url text check (video_url is null or video_url ~ '^https://'),
  image_url text,
  loads_joints boolean not null default false,
  gentle_alternative text check (char_length(gentle_alternative) <= 600),
  position int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.moves enable row level security;
drop policy if exists moves_read on public.moves;
create policy moves_read on public.moves for select to authenticated
  using (published or public.current_staff_role() is not null);

create table if not exists public.dog_skills (
  dog_id uuid not null references public.dogs(id) on delete cascade,
  move_id uuid not null references public.moves(id) on delete cascade,
  level text not null check (level in ('learning', 'reliable', 'performance')),
  set_by text not null default 'member' check (set_by in ('member', 'coach')),
  updated_at timestamptz not null default now(),
  primary key (dog_id, move_id)
);
alter table public.dog_skills enable row level security;
drop policy if exists dog_skills_read_own on public.dog_skills;
create policy dog_skills_read_own on public.dog_skills for select to authenticated
  using (exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = auth.uid()));

-- Members mark their own progress up to "reliable"; only Roni's team marks "performance".
create or replace function public.set_dog_skill(p_dog_id uuid, p_move_id uuid, p_level text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.dogs where id = p_dog_id and owner_id = auth.uid()) then
    raise exception 'that dog is not yours' using errcode = '42501';
  end if;
  if not exists (select 1 from public.moves where id = p_move_id and published) then
    raise exception 'move not found' using errcode = '22023';
  end if;
  if p_level is null then
    delete from public.dog_skills where dog_id = p_dog_id and move_id = p_move_id and set_by = 'member';
    return;
  end if;
  if p_level not in ('learning', 'reliable') then
    raise exception 'only Roni''s team can mark a move performance-ready' using errcode = '42501';
  end if;
  insert into public.dog_skills (dog_id, move_id, level, set_by)
  values (p_dog_id, p_move_id, p_level, 'member')
  on conflict (dog_id, move_id) do update
    set level = excluded.level, set_by = 'member', updated_at = now()
    where public.dog_skills.set_by = 'member';   -- a coach's level isn't overwritten
end;
$$;

-- ── 4. Lesson / course extras ───────────────────────────────
alter table public.lessons
  add column if not exists key_takeaways text[] not null default '{}',
  add column if not exists cues text[] not null default '{}',
  add column if not exists practice_steps jsonb not null default '[]'::jsonb,
  add column if not exists practice_minutes int check (practice_minutes between 1 and 60);
grant select (key_takeaways, cues, practice_steps, practice_minutes) on public.lessons to anon, authenticated;

alter table public.courses
  add column if not exists chapter_number int check (chapter_number between 1 and 99),
  add column if not exists requires_course_id text references public.courses(id) on delete set null,
  add column if not exists what_you_need jsonb not null default '[]'::jsonb,
  add column if not exists before_you_start text check (char_length(before_you_start) <= 600),
  add column if not exists trailer_url text check (trailer_url is null or trailer_url ~ '^https://');

-- ── 5. Practice sessions + weekly plan ──────────────────────
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  move_id uuid references public.moves(id) on delete set null,
  practiced_on date not null default current_date,
  duration_seconds int not null default 0 check (duration_seconds between 0 and 14400),
  reps int not null default 0 check (reps between 0 and 1000),
  steps_done int not null default 0 check (steps_done between 0 and 50),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists practice_sessions_user on public.practice_sessions (user_id, practiced_on desc);
alter table public.practice_sessions enable row level security;
drop policy if exists practice_sessions_own on public.practice_sessions;
create policy practice_sessions_own on public.practice_sessions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and (dog_id is null or exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = auth.uid()))
              and practiced_on <= current_date + 1);

create table if not exists public.practice_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete cascade,
  planned_on date not null,
  minutes int not null default 10 check (minutes between 1 and 60),
  lesson_id uuid references public.lessons(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists practice_plan_user on public.practice_plan (user_id, planned_on);
alter table public.practice_plan enable row level security;
drop policy if exists practice_plan_own on public.practice_plan;
create policy practice_plan_own on public.practice_plan for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and (dog_id is null or exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = auth.uid())));

-- ── 6. Lesson questions ─────────────────────────────────────
create table if not exists public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  answer text check (char_length(answer) <= 4000),
  answered_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists lesson_questions_lesson on public.lesson_questions (lesson_id, created_at desc);
alter table public.lesson_questions enable row level security;
revoke all on public.lesson_questions from anon, authenticated;

-- Everyone who can open the lesson sees its questions (first name only) and Roni's answers.
create or replace function public.lesson_questions_for(p_lesson_id uuid)
returns table (id uuid, body text, answer text, answered_at timestamptz, created_at timestamptz, asker text, is_mine boolean)
language sql stable security definer set search_path = public as $$
  select q.id, q.body, q.answer, q.answered_at, q.created_at,
         coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Member'), q.user_id = auth.uid()
    from public.lesson_questions q
    left join public.profiles p on p.id = q.user_id
   where q.lesson_id = p_lesson_id and not q.hidden
     and public.can_access_lesson(p_lesson_id)
   order by (q.answer is null), q.created_at desc
   limit 200;
$$;

create or replace function public.ask_lesson_question(p_lesson_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not public.can_access_lesson(p_lesson_id) then raise exception 'no access to this lesson' using errcode = '42501'; end if;
  if (select count(*) from public.lesson_questions where user_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'that''s a lot of questions for one day, try again tomorrow' using errcode = '54000';
  end if;
  insert into public.lesson_questions (lesson_id, user_id, body) values (p_lesson_id, auth.uid(), trim(p_body)) returning id into v_id;
  return v_id;
end;
$$;

-- ── 7. Video feedback ───────────────────────────────────────
create table if not exists public.feedback_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  move_id uuid references public.moves(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  note text check (char_length(note) <= 2000),
  mux_upload_id text,
  mux_asset_id text,
  mux_playback_id text,
  duration_seconds numeric,
  status text not null default 'uploading' check (status in ('uploading', 'waiting', 'replied', 'errored')),
  summary text check (char_length(summary) <= 4000),
  reviewed_by uuid references auth.users(id) on delete set null,
  replied_at timestamptz,
  member_read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists feedback_videos_user on public.feedback_videos (user_id, created_at desc);
create index if not exists feedback_videos_queue on public.feedback_videos (status, created_at);
alter table public.feedback_videos enable row level security;
drop policy if exists feedback_videos_read_own on public.feedback_videos;
create policy feedback_videos_read_own on public.feedback_videos for select to authenticated using (user_id = auth.uid());

create table if not exists public.feedback_notes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.feedback_videos(id) on delete cascade,
  at_seconds numeric not null check (at_seconds >= 0),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.feedback_notes enable row level security;
drop policy if exists feedback_notes_read_own on public.feedback_notes;
create policy feedback_notes_read_own on public.feedback_notes for select to authenticated
  using (exists (select 1 from public.feedback_videos v where v.id = video_id and v.user_id = auth.uid()));

create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.feedback_videos(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  from_staff boolean not null default false,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.feedback_messages enable row level security;
drop policy if exists feedback_messages_read_own on public.feedback_messages;
create policy feedback_messages_read_own on public.feedback_messages for select to authenticated
  using (exists (select 1 from public.feedback_videos v where v.id = video_id and v.user_id = auth.uid()));

create or replace function public.reply_to_feedback(p_video_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.feedback_videos where id = p_video_id and user_id = auth.uid()) then
    raise exception 'video not found' using errcode = '42501';
  end if;
  insert into public.feedback_messages (video_id, author_id, body) values (p_video_id, auth.uid(), trim(p_body));
end;
$$;

create or replace function public.mark_feedback_read(p_video_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.feedback_videos set member_read_at = coalesce(member_read_at, now())
   where id = p_video_id and user_id = auth.uid() and status = 'replied';
$$;

-- ── 8. Notifications ────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('feedback', 'answer', 'achievement', 'lesson', 'event', 'support', 'system')),
  title text not null check (char_length(title) <= 160),
  body text check (char_length(body) <= 400),
  href text check (href is null or href ~ '^/'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications for select to authenticated using (user_id = auth.uid());

create or replace function public.mark_notifications_read(p_ids uuid[])
returns void language sql security definer set search_path = public as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
$$;

create or replace function private.notify(p_user uuid, p_kind text, p_title text, p_body text, p_href text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, href) values (p_user, p_kind, left(p_title, 160), left(p_body, 400), p_href);
$$;

-- Roni replied to a video → notify the member.
create or replace function private.feedback_replied()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'replied' and old.status is distinct from 'replied' then
    perform private.notify(new.user_id, 'feedback', 'Roni replied to your ' || new.title || ' video',
                           (select count(*) from public.feedback_notes where video_id = new.id)::text || ' notes and a summary',
                           '/feedback/' || new.id);
    perform private.award_achievement(new.user_id, 'first_feedback');
  end if;
  return new;
end;
$$;

-- A question was answered → notify whoever asked.
create or replace function private.question_answered()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.answer is not null and old.answer is null then
    perform private.notify(new.user_id, 'answer', 'Roni answered your question',
                           left(new.body, 120),
                           '/learn/' || (select course_id from public.lessons where id = new.lesson_id) || '/' || new.lesson_id || '?tab=questions');
  end if;
  return new;
end;
$$;

-- ── 9. Support requests ─────────────────────────────────────
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('question', 'bug', 'story')),
  subject text check (char_length(subject) <= 200),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  page_url text check (char_length(page_url) <= 500),
  consent_public boolean not null default false,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  answer text check (char_length(answer) <= 5000),
  answered_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists support_requests_status on public.support_requests (status, created_at desc);
alter table public.support_requests enable row level security;
drop policy if exists support_requests_read_own on public.support_requests;
create policy support_requests_read_own on public.support_requests for select to authenticated using (user_id = auth.uid());

create or replace function public.submit_support_request(p_kind text, p_subject text, p_body text, p_page_url text, p_consent_public boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if (select count(*) from public.support_requests where user_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many requests today, try again tomorrow' using errcode = '54000';
  end if;
  insert into public.support_requests (user_id, kind, subject, body, page_url, consent_public)
  values (auth.uid(), p_kind, nullif(trim(p_subject), ''), trim(p_body), p_page_url, coalesce(p_consent_public, false))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function private.support_answered()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.answer is not null and old.answer is null and new.user_id is not null then
    perform private.notify(new.user_id, 'support', 'Roni''s team replied', left(coalesce(new.subject, new.body), 120), '/help');
  end if;
  return new;
end;
$$;

-- ── 10. Live Q&A ────────────────────────────────────────────
alter table public.community_meetups
  add column if not exists kind text not null default 'meetup',
  add column if not exists recording_url text,
  add column if not exists recording_minutes int check (recording_minutes between 1 and 600);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_meetups_kind_check') then
    alter table public.community_meetups add constraint community_meetups_kind_check check (kind in ('meetup', 'live_qa'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'community_meetups_recording_url_check') then
    alter table public.community_meetups add constraint community_meetups_recording_url_check check (recording_url is null or recording_url ~ '^https://');
  end if;
end $$;
grant select (kind, recording_url, recording_minutes) on public.community_meetups to authenticated;

alter table public.community_settings
  add column if not exists whatsapp_url text check (whatsapp_url is null or whatsapp_url ~ '^https://');

create table if not exists public.qa_questions (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.community_meetups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  answered boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.qa_questions enable row level security;
drop policy if exists qa_questions_read_own on public.qa_questions;
create policy qa_questions_read_own on public.qa_questions for select to authenticated using (user_id = auth.uid());

create or replace function public.send_qa_question(p_meetup_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not public.can_access_community() then raise exception 'members only' using errcode = '42501'; end if;
  if not exists (select 1 from public.community_meetups where id = p_meetup_id and published and not canceled and starts_at > now()) then
    raise exception 'that Q&A is not open for questions' using errcode = '22023';
  end if;
  if (select count(*) from public.qa_questions where user_id = auth.uid() and meetup_id = p_meetup_id) >= 5 then
    raise exception 'up to 5 questions per session' using errcode = '54000';
  end if;
  insert into public.qa_questions (meetup_id, user_id, body) values (p_meetup_id, auth.uid(), trim(p_body)) returning id into v_id;
  return v_id;
end;
$$;

-- ── 11. Routines ────────────────────────────────────────────
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  music_path text check (char_length(music_path) <= 300),
  music_name text check (char_length(music_name) <= 200),
  duration_seconds int check (duration_seconds between 1 and 1200),
  bpm int check (bpm between 30 and 300),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  sent_for_feedback_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.routines enable row level security;
drop policy if exists routines_own on public.routines;
create policy routines_own on public.routines for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and (music_path is null or music_path like auth.uid()::text || '/%')
              and (dog_id is null or exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = auth.uid())));

-- ── 12. Achievements ────────────────────────────────────────
insert into public.achievement_defs (code, title, description, icon, rule) values
  ('first_practice', 'First practice', 'Logged your first practice session.', 'pets', 'first_practice'),
  ('rhythm_6', '6-day rhythm', 'Practised six days in a row.', 'event_repeat', 'practice_streak_6'),
  ('first_feedback', 'First feedback', 'Received notes from Roni on a video.', 'rate_review', 'first_feedback'),
  ('first_routine', 'First routine', 'Built your first routine to music.', 'music_note', 'first_routine')
on conflict (code) do nothing;

create or replace function private.award_achievement(p_user uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.achievements (user_id, code) values (p_user, p_code) on conflict do nothing;
  if found then
    perform private.notify(p_user, 'achievement',
                           'New achievement: ' || (select title from public.achievement_defs where code = p_code),
                           (select description from public.achievement_defs where code = p_code), '/progress');
  end if;
end;
$$;

-- Longest run of consecutive practice days ending at p_day.
create or replace function private.practice_streak(p_user uuid, p_day date)
returns int language sql stable security definer set search_path = public as $$
  with recursive days(d, n) as (
    select p_day, 1 where exists (select 1 from public.practice_sessions where user_id = p_user and practiced_on = p_day)
    union all
    select d - 1, n + 1 from days
     where n < 60 and exists (select 1 from public.practice_sessions where user_id = p_user and practiced_on = d - 1)
  )
  select coalesce(max(n), 0) from days;
$$;

create or replace function private.practice_logged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform private.award_achievement(new.user_id, 'first_practice');
  if private.practice_streak(new.user_id, new.practiced_on) >= 6 then
    perform private.award_achievement(new.user_id, 'rhythm_6');
  end if;
  return new;
end;
$$;
drop trigger if exists practice_logged on public.practice_sessions;
create trigger practice_logged after insert on public.practice_sessions for each row execute function private.practice_logged();

create or replace function private.routine_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform private.award_achievement(new.user_id, 'first_routine');
  return new;
end;
$$;
drop trigger if exists routine_created on public.routines;
create trigger routine_created after insert on public.routines for each row execute function private.routine_created();

drop trigger if exists feedback_replied on public.feedback_videos;
create trigger feedback_replied after update of status on public.feedback_videos for each row execute function private.feedback_replied();
drop trigger if exists question_answered on public.lesson_questions;
create trigger question_answered after update of answer on public.lesson_questions for each row execute function private.question_answered();
drop trigger if exists support_answered on public.support_requests;
create trigger support_answered after update of answer on public.support_requests for each row execute function private.support_answered();

-- ── 13. Storage ─────────────────────────────────────────────
-- profile-photos: public (avatars and dog photos are shown around the app); uploads only via
-- server-issued signed URLs into the member's own folder. routine-music: private.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('routine-music', 'routine-music', false, 20971520, array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/aac', 'audio/ogg'])
    on conflict (id) do nothing;
  end if;
end $$;

-- ── 14. Admin "People" ──────────────────────────────────────
-- p_filter: all | students (an active course) | no_course | team | not_onboarded
create or replace function public.admin_list_people(p_search text, p_filter text, p_limit int, p_offset int)
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  full_name text,
  avatar_url text,
  dog_name text,
  staff_role text,
  onboarded boolean,
  completed_lessons bigint,
  enrollments jsonb,
  total_count bigint
)
language sql stable security definer set search_path = public as $$
  with base as (
    select u.id, u.email::text as email, u.created_at, u.last_sign_in_at,
           p.full_name, p.avatar_url, p.onboarded_at,
           (select d.name from public.dogs d where d.id = p.active_dog_id) as dog_name,
           s.role as staff_role,
           exists (select 1 from public.enrollments e where e.user_id = u.id and (e.expires_at is null or e.expires_at > now())) as has_course
      from auth.users u
      left join public.profiles p on p.id = u.id
      left join public.staff_members s on s.user_id = u.id
     where coalesce(p_search, '') = ''
        or u.email ilike '%' || p_search || '%'
        or p.full_name ilike '%' || p_search || '%'
  )
  select b.id, b.email, b.created_at, b.last_sign_in_at, b.full_name, b.avatar_url, b.dog_name, b.staff_role,
         b.onboarded_at is not null,
         (select count(*) from public.lesson_progress lp where lp.user_id = b.id and lp.completed_at is not null),
         coalesce((
           select jsonb_agg(jsonb_build_object('course_id', e.course_id, 'title', c.title, 'source', e.source,
                                               'expires_at', e.expires_at, 'access_level', e.access_level)
                            order by e.enrolled_at desc)
             from public.enrollments e join public.courses c on c.id = e.course_id
            where e.user_id = b.id
         ), '[]'::jsonb),
         count(*) over ()
    from base b
   where case coalesce(p_filter, 'all')
           when 'students' then b.has_course
           when 'no_course' then not b.has_course and b.staff_role is null
           when 'team' then b.staff_role is not null
           when 'not_onboarded' then b.onboarded_at is null
           else true
         end
   order by b.created_at desc
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ── Grants ──────────────────────────────────────────────────
revoke all on function public.set_dog_skill(uuid, uuid, text) from public, anon;
revoke all on function public.lesson_questions_for(uuid) from public, anon;
revoke all on function public.ask_lesson_question(uuid, text) from public, anon;
revoke all on function public.reply_to_feedback(uuid, text) from public, anon;
revoke all on function public.mark_feedback_read(uuid) from public, anon;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
revoke all on function public.submit_support_request(text, text, text, text, boolean) from public, anon;
revoke all on function public.send_qa_question(uuid, text) from public, anon;
revoke all on function public.admin_list_people(text, text, int, int) from public, anon, authenticated;
grant execute on function public.set_dog_skill(uuid, uuid, text) to authenticated;
grant execute on function public.lesson_questions_for(uuid) to authenticated;
grant execute on function public.ask_lesson_question(uuid, text) to authenticated;
grant execute on function public.reply_to_feedback(uuid, text) to authenticated;
grant execute on function public.mark_feedback_read(uuid) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.submit_support_request(text, text, text, text, boolean) to authenticated;
grant execute on function public.send_qa_question(uuid, text) to authenticated;
grant execute on function public.admin_list_people(text, text, int, int) to service_role;
revoke all on function private.notify(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function private.award_achievement(uuid, text) from public, anon, authenticated;
revoke all on function private.practice_streak(uuid, date) from public, anon, authenticated;
