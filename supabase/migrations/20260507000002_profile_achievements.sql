-- ============================================================
-- Profile fields + achievements + auto-award on lesson completion
-- Apply via Supabase SQL editor AFTER 001_phase1.sql
-- ============================================================

-- Extra profile fields
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists dog_breed text;
alter table public.profiles add column if not exists dog_age int;
alter table public.profiles add column if not exists tagline text;          -- the editorial headline on /profile
alter table public.profiles add column if not exists notif_prefs jsonb not null default '{"new_courses":true,"live_sessions":true,"community":false}'::jsonb;

-- Achievement catalog (static-ish, but lives in DB so admins can add)
create table if not exists public.achievement_defs (
  code text primary key,
  title text not null,
  description text not null,
  icon text not null,                -- material symbol name
  -- 'first_lesson','course_complete','streak_7','first_upload', etc.
  rule text not null
);

insert into public.achievement_defs (code, title, description, icon, rule) values
  ('first_lesson',   'First Dance',    'Completed your first lesson.',           'star',             'first_lesson'),
  ('course_complete','Course Champion','Completed an entire course.',            'workspace_premium','course_complete'),
  ('three_lessons',  'Warming Up',     'Completed 3 lessons.',                   'local_fire_department', 'lessons_count_3'),
  ('ten_lessons',    'On the Beat',    'Completed 10 lessons.',                  'music_note',       'lessons_count_10')
on conflict (code) do nothing;

-- User-earned achievements
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null references public.achievement_defs(code) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, code)
);

alter table public.achievements enable row level security;

create policy "achievements_select_own"
  on public.achievements for select using (auth.uid() = user_id);

create policy "achievements_select_public_for_spotlight"
  on public.achievements for select using (true);   -- counts visible publicly

-- Trigger: award achievements on lesson_progress completion
create or replace function public.award_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_course_id text;
  v_total_in_course int;
  v_done_in_course int;
begin
  -- only fire when newly completed
  if new.completed_at is null then return new; end if;
  if (tg_op = 'UPDATE' and old.completed_at is not null) then return new; end if;

  -- first_lesson
  insert into public.achievements (user_id, code) values (new.user_id, 'first_lesson')
    on conflict do nothing;

  -- count completed lessons
  select count(*) into v_count
    from public.lesson_progress
   where user_id = new.user_id and completed_at is not null;

  if v_count >= 3 then
    insert into public.achievements (user_id, code) values (new.user_id, 'three_lessons')
      on conflict do nothing;
  end if;
  if v_count >= 10 then
    insert into public.achievements (user_id, code) values (new.user_id, 'ten_lessons')
      on conflict do nothing;
  end if;

  -- course_complete: did this push the user to 100% on the course?
  select l.course_id into v_course_id from public.lessons l where l.id = new.lesson_id;
  select count(*) into v_total_in_course from public.lessons where course_id = v_course_id;
  select count(*) into v_done_in_course
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
   where lp.user_id = new.user_id and lp.completed_at is not null and l.course_id = v_course_id;

  if v_total_in_course > 0 and v_done_in_course >= v_total_in_course then
    insert into public.achievements (user_id, code) values (new.user_id, 'course_complete')
      on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_award_achievements on public.lesson_progress;
create trigger trg_award_achievements
  after insert or update on public.lesson_progress
  for each row execute function public.award_achievements();
