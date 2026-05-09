-- ============================================================
-- Keta Tov LMS schema
-- Apply via Supabase SQL editor (or `supabase db push`)
-- ============================================================

-- Profiles -----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  dog_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_upsert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Courses ------------------------------------------------------
create table if not exists public.courses (
  id text primary key,
  title text not null,
  description text not null,
  level text not null check (level in ('Beginner','Intermediate','Advanced')),
  category text not null,
  price numeric(10,2) not null default 0,
  badge text,
  image text,
  image_alt text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "courses_public_read"
  on public.courses for select
  using (published = true);

-- Lessons ------------------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  position int not null,
  title text not null,
  description text,
  duration_seconds int,
  mux_playback_id text,
  mux_playback_policy text not null default 'signed' check (mux_playback_policy in ('public','signed')),
  free_preview boolean not null default false,
  created_at timestamptz not null default now(),
  unique (course_id, position)
);

alter table public.lessons enable row level security;

-- Anyone can see lesson metadata (titles, order). Only enrolled users get playback IDs (enforced in app code via signed URL endpoint).
create policy "lessons_public_read_meta"
  on public.lessons for select
  using (true);

-- Enrollments --------------------------------------------------
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.enrollments enable row level security;

create policy "enrollments_select_own"
  on public.enrollments for select
  using (auth.uid() = user_id);

create policy "enrollments_insert_own"
  on public.enrollments for insert
  with check (auth.uid() = user_id);

create policy "enrollments_delete_own"
  on public.enrollments for delete
  using (auth.uid() = user_id);

-- Progress -----------------------------------------------------
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz,
  watch_seconds int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

create policy "progress_select_own"
  on public.lesson_progress for select
  using (auth.uid() = user_id);

create policy "progress_upsert_own"
  on public.lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "progress_update_own"
  on public.lesson_progress for update
  using (auth.uid() = user_id);

-- Helper view: is the current user enrolled in a course?
create or replace view public.my_enrollments as
  select course_id from public.enrollments where user_id = auth.uid();

-- ============================================================
-- Seed data (optional — keeps app/lib/data.ts in sync as DB rows)
-- ============================================================
insert into public.courses (id, title, description, level, category, price, badge, image, image_alt) values
  ('kinetic-basics', 'The Kinetic Basics: First Steps to Rhythm', 'Learn the fundamental movements that form the backbone of every dog dance routine, including focus and basic positioning.', 'Beginner', 'Foundations', 49, 'Included in Pro', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwXwgEQpqaf2YHDfk-I8RjVyi7frfIlbW8XCuPyuPAP_1U7lbaiDiX2KVyuYKjjlhzwU5z3A58ZLITFTDvf9Maae5Rsa7QcxLKkNSqDeq9ZCFg9LCztDB_CQi-Fb95taoRdQyxbh5erABtnIh8WxsJ_7lbW6YC9wRFdEurVSOqCuwvM3sd6yaknN-6uLYlO3eWNmjOnUyVXiEk2AEfkPs2UR2QcwVyl6sIibeAVWuby--9bPjH20K9_7wQd6NeBHIzqlUB6mKEq8Hj', 'A joyful border collie performing a leg weave'),
  ('advanced-spins', 'Advanced Spins & Vertical Transitions', 'Elevate your performance with dynamic spins, jumps, and vertical elements that add flair to any routine.', 'Intermediate', 'Trick Training', 65, 'Included in Pro', '', ''),
  ('musical-mastery', 'Musical Mastery: Syncing with the Beat', 'A masterclass in musicality. Learn to analyze music and build a narrative routine.', 'Advanced', 'Choreography', 89, 'Mastery Series', '', ''),
  ('perfect-heelwork', 'Perfect Heelwork: The Foundation of Flow', 'Achieve a perfect glue heel that stays consistent through turns and speed changes.', 'Beginner', 'Foundations', 35, 'Pro Only', '', ''),
  ('puppy-prodigy', 'Puppy Prodigy: Early Rhythmic Play', 'Fun games and focus exercises designed specifically for developing puppy minds and bodies.', 'Beginner', 'Foundations', 29, 'Best Value', '', ''),
  ('prop-work', 'Prop Work & Hoops: Stage Mechanics', 'Incorporate props seamlessly into your dance.', 'Intermediate', 'Trick Training', 55, 'Popular', '', '')
on conflict (id) do nothing;
