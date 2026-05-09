-- ============================================================
-- Certificates auto-issue + student video uploads
-- Apply via Supabase SQL editor AFTER 002_profile_achievements.sql
-- ============================================================

-- ── Certificate auto-issue trigger ──────────────────────────
-- Fires after lesson_progress completion: if user has now finished
-- all lessons in a course, insert a certificate (idempotent).
create or replace function public.maybe_issue_certificate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id text;
  v_total int;
  v_done int;
  v_full_name text;
  v_course_title text;
  v_code text;
begin
  if new.completed_at is null then return new; end if;
  if (tg_op = 'UPDATE' and old.completed_at is not null) then return new; end if;

  select course_id into v_course_id from public.lessons where id = new.lesson_id;
  if v_course_id is null then return new; end if;

  select count(*) into v_total from public.lessons where course_id = v_course_id;
  select count(*) into v_done
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
   where lp.user_id = new.user_id and lp.completed_at is not null and l.course_id = v_course_id;

  if v_total = 0 or v_done < v_total then return new; end if;

  select coalesce(full_name, '') into v_full_name from public.profiles where id = new.user_id;
  select title into v_course_title from public.courses where id = v_course_id;
  v_code := encode(gen_random_bytes(8), 'hex');

  insert into public.certificates (code, user_id, course_id, student_name, course_title)
  values (v_code, new.user_id, v_course_id, coalesce(nullif(v_full_name, ''), 'Member'), v_course_title)
  on conflict (user_id, course_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_issue_certificate on public.lesson_progress;
create trigger trg_issue_certificate
  after insert or update on public.lesson_progress
  for each row execute function public.maybe_issue_certificate();

-- ── Student video uploads ───────────────────────────────────
create table if not exists public.student_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- optional ties to a course or lesson
  course_id text references public.courses(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  description text,
  -- mux fields
  mux_upload_id text,
  mux_asset_id text,
  mux_playback_id text,
  status text not null default 'preparing' check (status in ('preparing','ready','errored')),
  -- visibility
  is_public boolean not null default false,
  consent_public boolean not null default false,
  -- moderation (admins approve before public listing)
  approved boolean not null default false,
  duration_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_videos_user on public.student_videos(user_id);
create index if not exists idx_student_videos_public on public.student_videos(is_public, approved, status) where is_public = true;

alter table public.student_videos enable row level security;

create policy "videos_select_own" on public.student_videos
  for select using (auth.uid() = user_id);

create policy "videos_select_public" on public.student_videos
  for select using (is_public = true and approved = true and status = 'ready');

create policy "videos_insert_own" on public.student_videos
  for insert with check (auth.uid() = user_id);

create policy "videos_update_own" on public.student_videos
  for update using (auth.uid() = user_id);

create policy "videos_delete_own" on public.student_videos
  for delete using (auth.uid() = user_id);
