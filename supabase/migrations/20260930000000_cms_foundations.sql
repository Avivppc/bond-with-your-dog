-- ============================================================
-- Stage A1: CMS foundations
--   * staff roles (owner = platform owner, editor = the client's content team)
--   * modules with at most two levels (module → submodule), like Kajabi
--   * draft/published on modules and lessons; students only ever see live content
-- Writes still go through server actions using the service role after a role check;
-- these tables only grant reads to clients.
-- Tests: supabase/tests/cms_foundations.test.sql (npm run test:db)
-- ============================================================

-- ── Staff roles ─────────────────────────────────────────────
create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;

drop policy if exists "staff_members_select_own" on public.staff_members;
create policy "staff_members_select_own"
  on public.staff_members for select
  using (auth.uid() = user_id);

-- The caller's staff role, or null. Used by RLS policies and the admin guard.
create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.staff_members where user_id = auth.uid();
$$;

-- ── Modules ─────────────────────────────────────────────────
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  parent_id uuid references public.modules(id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_modules_course on public.modules(course_id, parent_id, position);
alter table public.modules enable row level security;

-- Structure rules: two levels max, and a submodule shares its parent's course.
create or replace function private.check_module_structure()
returns trigger
language plpgsql
as $$
declare
  v_parent public.modules%rowtype;
begin
  if new.parent_id is null then return new; end if;
  select * into v_parent from public.modules where id = new.parent_id;
  if v_parent.parent_id is not null then
    raise exception 'modules nest at most two levels' using errcode = '23514';
  end if;
  if v_parent.course_id <> new.course_id then
    raise exception 'submodule must belong to its parent''s course' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_check_module_structure on public.modules;
create trigger trg_check_module_structure
  before insert or update of parent_id, course_id on public.modules
  for each row execute function private.check_module_structure();

-- A module is live when it and (if any) its parent are published.
-- SECURITY DEFINER so RLS policies can call it without recursing into modules' own policy.
create or replace function public.is_module_live(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select m.published and coalesce(p.published, true)
    from public.modules m
    left join public.modules p on p.id = m.parent_id
    where m.id = p_module_id
  ), false);
$$;

-- ── Lessons: module membership + draft/published ────────────
alter table public.lessons
  add column if not exists module_id uuid references public.modules(id) on delete restrict;
alter table public.lessons add column if not exists published boolean not null default true;  -- existing lessons stay live
create index if not exists idx_lessons_module on public.lessons(module_id, position);

-- Ordering is rewritten wholesale by reorder_lessons(); a per-course unique position blocks that.
alter table public.lessons drop constraint if exists lessons_course_id_position_key;

create or replace function private.check_lesson_module()
returns trigger
language plpgsql
as $$
begin
  if new.module_id is not null and not exists (
    select 1 from public.modules where id = new.module_id and course_id = new.course_id
  ) then
    raise exception 'lesson must belong to its module''s course' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_check_lesson_module on public.lessons;
create trigger trg_check_lesson_module
  before insert or update of module_id, course_id on public.lessons
  for each row execute function private.check_lesson_module();

-- ── Read policies: students see live content, staff see everything ──
drop policy if exists "courses_public_read" on public.courses;
drop policy if exists "courses_read" on public.courses;
create policy "courses_read"
  on public.courses for select
  using (published or public.current_staff_role() is not null);

drop policy if exists "modules_read" on public.modules;
create policy "modules_read"
  on public.modules for select
  using (public.current_staff_role() is not null or public.is_module_live(id));

drop policy if exists "lessons_public_read_meta" on public.lessons;
drop policy if exists "lessons_read" on public.lessons;
create policy "lessons_read"
  on public.lessons for select
  using (
    public.current_staff_role() is not null
    or (published and (module_id is null or public.is_module_live(module_id)))
  );

revoke insert, update, delete, truncate on public.staff_members, public.modules, public.lessons, public.courses
  from anon, authenticated;

-- ── can_access_lesson: now also requires live content; staff may preview anything ──
create or replace function public.can_access_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_staff_role() is not null
      or exists (
        select 1
        from public.lessons l
        where l.id = p_lesson_id
          and l.published
          and (l.module_id is null or public.is_module_live(l.module_id))
          and (
            l.free_preview
            or exists (
              select 1
              from public.enrollments e
              where e.course_id = l.course_id
                and e.user_id = auth.uid()
                and (e.expires_at is null or e.expires_at > now())
                and now() >= e.enrolled_at + make_interval(days => coalesce(l.available_after_days, 0))
            )
          )
      );
$$;

-- ── Reordering (drag & drop in the admin) ───────────────────
create or replace function public.reorder_lessons(p_module_id uuid, p_lesson_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from unnest(p_lesson_ids) as x(id)
    where not exists (select 1 from public.lessons l where l.id = x.id and l.module_id = p_module_id)
  ) then
    raise exception 'every lesson must belong to module %', p_module_id using errcode = '22023';
  end if;

  update public.lessons l
     set position = o.ord
    from unnest(p_lesson_ids) with ordinality as o(id, ord)
   where l.id = o.id;
end;
$$;

create or replace function public.reorder_modules(p_course_id text, p_parent_id uuid, p_module_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from unnest(p_module_ids) as x(id)
    where not exists (
      select 1 from public.modules m
      where m.id = x.id and m.course_id = p_course_id and m.parent_id is not distinct from p_parent_id
    )
  ) then
    raise exception 'every module must belong to course % under the same parent', p_course_id using errcode = '22023';
  end if;

  update public.modules m
     set position = o.ord, updated_at = now()
    from unnest(p_module_ids) with ordinality as o(id, ord)
   where m.id = o.id;
end;
$$;

-- ── Backfill: legacy flat lessons get a default module per course ──
create or replace function private.backfill_default_modules()
returns void
language plpgsql
as $$
declare
  v_course text;
  v_module uuid;
begin
  for v_course in
    select distinct course_id from public.lessons where module_id is null
  loop
    insert into public.modules (course_id, title, position, published)
    values (v_course, 'Course content',
            coalesce((select max(position) + 1 from public.modules where course_id = v_course and parent_id is null), 1),
            true)
    returning id into v_module;

    update public.lessons set module_id = v_module where course_id = v_course and module_id is null;
  end loop;
end;
$$;
select private.backfill_default_modules();

-- ── Execute grants (Supabase grants EXECUTE to API roles by default) ──
revoke all on function public.current_staff_role() from public, anon, authenticated;
revoke all on function public.is_module_live(uuid) from public, anon, authenticated;
revoke all on function public.reorder_lessons(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.reorder_modules(text, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.can_access_lesson(uuid) from public, anon, authenticated;

grant execute on function public.current_staff_role() to anon, authenticated, service_role;
grant execute on function public.is_module_live(uuid) to anon, authenticated, service_role;
grant execute on function public.can_access_lesson(uuid) to anon, authenticated, service_role;
grant execute on function public.reorder_lessons(uuid, uuid[]) to service_role;
grant execute on function public.reorder_modules(text, uuid, uuid[]) to service_role;
