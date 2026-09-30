-- ============================================================
-- Paywall (Kajabi "limited access"): a course may have a paywall after one of its top-level
-- modules. Offers grant each course with full or limited access; limited members open only
-- content above the paywall (free previews stay open to everyone).
-- Tests: supabase/tests/paywall.test.sql
-- ============================================================

alter table public.courses
  add column if not exists paywall_after_module_id uuid references public.modules(id) on delete set null;

alter table public.offer_courses
  add column if not exists access_level text not null default 'full' check (access_level in ('full', 'limited'));
alter table public.access_grants
  add column if not exists access_level text not null default 'full' check (access_level in ('full', 'limited'));
alter table public.enrollments
  add column if not exists access_level text not null default 'full' check (access_level in ('full', 'limited'));

-- The paywall sits between top-level modules of the same course.
create or replace function private.check_course_paywall()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.paywall_after_module_id is not null and not exists (
    select 1 from public.modules
     where id = new.paywall_after_module_id and course_id = new.id and parent_id is null
  ) then
    raise exception 'paywall must follow a top-level module of this course' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_check_course_paywall on public.courses;
create trigger trg_check_course_paywall
  before insert or update of paywall_after_module_id on public.courses
  for each row execute function private.check_course_paywall();

-- True when the lesson's top-level module comes after the course's paywall module.
-- Lessons without a module count as behind it (the safe side).
create or replace function private.lesson_behind_paywall(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
             when c.paywall_after_module_id is null then false
             when l.module_id is null then true
             else top.position > pw.position
           end
      from public.lessons l
      join public.courses c on c.id = l.course_id
      left join public.modules m on m.id = l.module_id
      left join public.modules top on top.id = coalesce(m.parent_id, m.id)
      left join public.modules pw on pw.id = c.paywall_after_module_id
     where l.id = p_lesson_id
  ), false);
$$;

-- Enrollment = union of live grants; full access wins over limited.
create or replace function private.recompute_enrollment(p_user_id uuid, p_course_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_live int;
  v_lifetime boolean;
  v_max timestamptz;
  v_full boolean;
  v_source text;
  v_order uuid;
begin
  select count(*), coalesce(bool_or(expires_at is null), false), max(expires_at), coalesce(bool_or(access_level = 'full'), false)
    into v_live, v_lifetime, v_max, v_full
    from public.access_grants
   where user_id = p_user_id and course_id = p_course_id and revoked_at is null
     and (expires_at is null or expires_at > now());

  if v_live = 0 then
    update public.enrollments
       set expires_at = now()
     where user_id = p_user_id and course_id = p_course_id
       and (expires_at is null or expires_at > now());
    return false;
  end if;

  select source, order_id into v_source, v_order
    from public.access_grants
   where user_id = p_user_id and course_id = p_course_id and revoked_at is null
     and (expires_at is null or expires_at > now())
   order by (access_level = 'full') desc, (expires_at is null) desc, expires_at desc nulls first, created_at desc
   limit 1;

  insert into public.enrollments (user_id, course_id, source, order_id, expires_at, access_level)
  values (p_user_id, p_course_id, v_source, v_order, case when v_lifetime then null else v_max end,
          case when v_full then 'full' else 'limited' end)
  on conflict (user_id, course_id) do update
    set expires_at = excluded.expires_at,
        source = excluded.source,
        order_id = excluded.order_id,
        access_level = excluded.access_level;
  return true;
end;
$$;

create or replace function public.grant_offer_access(
  p_user_id uuid, p_offer_id uuid, p_source text, p_order_id uuid, p_expires_at timestamptz
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course text;
  v_level text;
  v_was_active boolean;
  v_newly_active int := 0;
begin
  for v_course, v_level in select course_id, access_level from public.offer_courses where offer_id = p_offer_id loop
    select exists (
      select 1 from public.enrollments
       where user_id = p_user_id and course_id = v_course and (expires_at is null or expires_at > now())
    ) into v_was_active;

    if p_order_id is not null then
      -- One grant per order and course; renewals of the same order extend it. Never un-revokes.
      insert into public.access_grants (user_id, course_id, offer_id, order_id, source, expires_at, access_level)
      values (p_user_id, v_course, p_offer_id, p_order_id, p_source, p_expires_at, v_level)
      on conflict (user_id, course_id, order_id) where order_id is not null do update
        set expires_at = case
              when public.access_grants.expires_at is null or excluded.expires_at is null then null
              else greatest(public.access_grants.expires_at, excluded.expires_at)
            end;
    else
      insert into public.access_grants (user_id, course_id, offer_id, source, expires_at, access_level)
      values (p_user_id, v_course, p_offer_id, p_source, p_expires_at, v_level);
    end if;

    if private.recompute_enrollment(p_user_id, v_course) and not v_was_active then
      v_newly_active := v_newly_active + 1;
      perform private.emit_event('access.granted', p_user_id, 'course', v_course,
                                 jsonb_build_object('offer_id', p_offer_id, 'source', p_source, 'order_id', p_order_id, 'access_level', v_level));
    end if;
  end loop;
  return v_newly_active;
end;
$$;

-- Same rule as before, plus: limited enrollments stop at the paywall.
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
                and (e.access_level = 'full' or not private.lesson_behind_paywall(l.id))
            )
          )
      );
$$;

revoke all on function private.check_course_paywall() from public, anon, authenticated;
revoke all on function private.lesson_behind_paywall(uuid) from public, anon, authenticated;
revoke all on function private.recompute_enrollment(uuid, text) from public, anon, authenticated;
revoke all on function public.grant_offer_access(uuid, uuid, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.can_access_lesson(uuid) from public, anon, authenticated;
grant execute on function public.grant_offer_access(uuid, uuid, text, uuid, timestamptz) to service_role;
grant execute on function public.can_access_lesson(uuid) to anon, authenticated, service_role;
