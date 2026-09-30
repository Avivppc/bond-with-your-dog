-- ============================================================
-- Review hardening (security + correctness reviews of the CMS/commerce branch)
--   1. access_grants: every grant (order, subscription period, admin grant, free,
--      legacy) is its own row; enrollments are recomputed from live grants, so a
--      refund removes only what that order granted.
--   2. enroll_free can't bypass a published paid offer.
--   3. lessons.body_html is server-only (column privileges).
--   4. claim_billing_event: atomic claim for concurrent webhook deliveries.
--   5. Certificates/achievements count only live lessons (drafts no longer block them).
--   6. admin_list_students: paginated, server-side student list for the admin.
--      admin_user_emails: emails for a bounded set of user ids (orders page).
--   7. lesson-files bucket allows the advertised 200 MB.
-- Tests: supabase/tests/security_hardening.test.sql (+ existing suites)
-- ============================================================

-- ── 1. Access grants ────────────────────────────────────────
create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  source text not null,
  expires_at timestamptz,                      -- null = lifetime
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists access_grants_order_key
  on public.access_grants (user_id, course_id, order_id) where order_id is not null;
create index if not exists access_grants_live
  on public.access_grants (user_id, course_id) where revoked_at is null;
alter table public.access_grants enable row level security;
revoke all on public.access_grants from anon, authenticated;

-- Enrollment = union of live grants: lifetime if any live grant is lifetime, else the latest expiry.
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
  v_source text;
  v_order uuid;
begin
  select count(*), coalesce(bool_or(expires_at is null), false), max(expires_at)
    into v_live, v_lifetime, v_max
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
   order by (expires_at is null) desc, expires_at desc nulls first, created_at desc
   limit 1;

  insert into public.enrollments (user_id, course_id, source, order_id, expires_at)
  values (p_user_id, p_course_id, v_source, v_order, case when v_lifetime then null else v_max end)
  on conflict (user_id, course_id) do update
    set expires_at = excluded.expires_at,
        source = excluded.source,
        order_id = excluded.order_id;
  return true;
end;
$$;

-- Existing enrollments become grants so recomputes never drop them.
create or replace function private.backfill_access_grants()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.access_grants (user_id, course_id, order_id, source, expires_at)
  select e.user_id, e.course_id, e.order_id, e.source, e.expires_at
    from public.enrollments e
   where not exists (select 1 from public.access_grants g where g.user_id = e.user_id and g.course_id = e.course_id)
  on conflict do nothing;
$$;
select private.backfill_access_grants();

create or replace function public.grant_offer_access(
  p_user_id uuid, p_offer_id uuid, p_source text, p_order_id uuid, p_expires_at timestamptz
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course text;
  v_was_active boolean;
  v_newly_active int := 0;
begin
  for v_course in select course_id from public.offer_courses where offer_id = p_offer_id loop
    select exists (
      select 1 from public.enrollments
       where user_id = p_user_id and course_id = v_course and (expires_at is null or expires_at > now())
    ) into v_was_active;

    if p_order_id is not null then
      -- One grant per order and course; renewals of the same order extend it. Never un-revokes.
      insert into public.access_grants (user_id, course_id, offer_id, order_id, source, expires_at)
      values (p_user_id, v_course, p_offer_id, p_order_id, p_source, p_expires_at)
      on conflict (user_id, course_id, order_id) where order_id is not null do update
        set expires_at = case
              when public.access_grants.expires_at is null or excluded.expires_at is null then null
              else greatest(public.access_grants.expires_at, excluded.expires_at)
            end;
    else
      insert into public.access_grants (user_id, course_id, offer_id, source, expires_at)
      values (p_user_id, v_course, p_offer_id, p_source, p_expires_at);
    end if;

    if private.recompute_enrollment(p_user_id, v_course) and not v_was_active then
      v_newly_active := v_newly_active + 1;
      perform private.emit_event('access.granted', p_user_id, 'course', v_course,
                                 jsonb_build_object('offer_id', p_offer_id, 'source', p_source, 'order_id', p_order_id));
    end if;
  end loop;
  return v_newly_active;
end;
$$;

-- Revokes the grants from one order (refund / cancel), or every grant of the offer when p_order_id is null.
create or replace function public.revoke_offer_access(p_user_id uuid, p_offer_id uuid, p_order_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_course text;
begin
  update public.access_grants
     set revoked_at = now()
   where user_id = p_user_id
     and revoked_at is null
     and course_id in (select course_id from public.offer_courses where offer_id = p_offer_id)
     and ((p_order_id is not null and order_id = p_order_id) or (p_order_id is null and offer_id = p_offer_id));
  get diagnostics v_count = row_count;

  for v_course in select course_id from public.offer_courses where offer_id = p_offer_id loop
    perform private.recompute_enrollment(p_user_id, v_course);
  end loop;

  perform private.emit_event('access.revoked', p_user_id, 'offer', p_offer_id::text,
                             jsonb_build_object('order_id', p_order_id, 'grants', v_count));
  return v_count;
end;
$$;

-- Admin: end all of a student's access to one course.
create or replace function public.revoke_course_access(p_user_id uuid, p_course_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.access_grants set revoked_at = now()
   where user_id = p_user_id and course_id = p_course_id and revoked_at is null;
  perform private.recompute_enrollment(p_user_id, p_course_id);
  perform private.emit_event('access.revoked', p_user_id, 'course', p_course_id, '{}'::jsonb);
end;
$$;

-- ── 2. Free self-enrollment ─────────────────────────────────
create or replace function public.enroll_free(p_course_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (select 1 from public.courses where id = p_course_id and published and price = 0)
     or exists (
       select 1 from public.offer_courses oc
         join public.offers o on o.id = oc.offer_id
        where oc.course_id = p_course_id and o.status = 'published' and o.payment_type <> 'free'
     ) then
    raise exception 'course % is not open for free enrollment', p_course_id using errcode = '42501';
  end if;

  if exists (select 1 from public.enrollments
              where user_id = v_uid and course_id = p_course_id and (expires_at is null or expires_at > now())) then
    return;
  end if;

  insert into public.access_grants (user_id, course_id, source) values (v_uid, p_course_id, 'free');
  perform private.recompute_enrollment(v_uid, p_course_id);
  perform private.emit_event('enrollment.created', v_uid, 'course', p_course_id, jsonb_build_object('source', 'free'));
end;
$$;

-- ── 3. Lesson body is server-only ───────────────────────────
-- Clients may read every lessons column except body_html (loaded by the server after
-- can_access_lesson). NOTE: new lessons columns need an explicit grant in their migration.
revoke select on public.lessons from anon, authenticated;
do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'lessons' and column_name <> 'body_html';
  execute format('grant select (%s) on public.lessons to anon, authenticated', v_cols);
end $$;

-- ── 4. Webhook claiming ─────────────────────────────────────
alter table public.billing_events add column if not exists processing_started_at timestamptz;

create or replace function public.claim_billing_event(p_provider text, p_event_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  with claimed as (
    update public.billing_events
       set processing_started_at = now()
     where provider = p_provider and event_id = p_event_id
       and processed_at is null
       and (processing_started_at is null or processing_started_at < now() - interval '2 minutes')
    returning 1
  )
  select exists (select 1 from claimed);
$$;

-- ── 5. Certificates & achievements: live lessons only ───────
create or replace function private.course_live_lesson_counts(p_user_id uuid, p_course_id text, out total int, out done int)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.lessons l
      where l.course_id = p_course_id and l.published and (l.module_id is null or public.is_module_live(l.module_id))),
    (select count(*)::int from public.lesson_progress lp
       join public.lessons l on l.id = lp.lesson_id
      where lp.user_id = p_user_id and lp.completed_at is not null and l.course_id = p_course_id
        and l.published and (l.module_id is null or public.is_module_live(l.module_id)));
$$;

create or replace function public.maybe_issue_certificate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id text;
  v_counts record;
  v_full_name text;
  v_course_title text;
begin
  if new.completed_at is null then return new; end if;
  if (tg_op = 'UPDATE' and old.completed_at is not null) then return new; end if;

  select course_id into v_course_id from public.lessons where id = new.lesson_id;
  if v_course_id is null then return new; end if;

  select * into v_counts from private.course_live_lesson_counts(new.user_id, v_course_id);
  if v_counts.total = 0 or v_counts.done < v_counts.total then return new; end if;

  select coalesce(full_name, '') into v_full_name from public.profiles where id = new.user_id;
  select title into v_course_title from public.courses where id = v_course_id;

  insert into public.certificates (code, user_id, course_id, student_name, course_title)
  values (substr(replace(gen_random_uuid()::text, '-', ''), 1, 16), new.user_id, v_course_id,
          coalesce(nullif(v_full_name, ''), 'Member'), v_course_title)
  on conflict (user_id, course_id) do nothing;
  return new;
end;
$$;

create or replace function public.award_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_course_id text;
  v_counts record;
begin
  if new.completed_at is null then return new; end if;
  if (tg_op = 'UPDATE' and old.completed_at is not null) then return new; end if;

  insert into public.achievements (user_id, code) values (new.user_id, 'first_lesson') on conflict do nothing;

  select count(*) into v_count from public.lesson_progress where user_id = new.user_id and completed_at is not null;
  if v_count >= 3 then
    insert into public.achievements (user_id, code) values (new.user_id, 'three_lessons') on conflict do nothing;
  end if;
  if v_count >= 10 then
    insert into public.achievements (user_id, code) values (new.user_id, 'ten_lessons') on conflict do nothing;
  end if;

  select course_id into v_course_id from public.lessons where id = new.lesson_id;
  select * into v_counts from private.course_live_lesson_counts(new.user_id, v_course_id);
  if v_counts.total > 0 and v_counts.done >= v_counts.total then
    insert into public.achievements (user_id, code) values (new.user_id, 'course_complete') on conflict do nothing;
  end if;
  return new;
end;
$$;

-- ── 6. Admin student list (paginated, server-side) ──────────
create or replace function public.admin_list_students(p_search text, p_limit int, p_offset int)
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  full_name text,
  completed_lessons bigint,
  enrollments jsonb,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.email::text,
    u.created_at,
    p.full_name,
    (select count(*) from public.lesson_progress lp where lp.user_id = u.id and lp.completed_at is not null),
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'course_id', e.course_id, 'title', c.title, 'source', e.source, 'expires_at', e.expires_at
             ) order by e.enrolled_at desc)
        from public.enrollments e
        join public.courses c on c.id = e.course_id
       where e.user_id = u.id
    ), '[]'::jsonb),
    count(*) over ()
  from auth.users u
  left join public.profiles p on p.id = u.id
  where coalesce(p_search, '') = '' or u.email ilike '%' || p_search || '%'
  order by u.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.admin_user_emails(p_user_ids uuid[])
returns table (user_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text
  from auth.users u
  where u.id = any(p_user_ids[1:500]);
$$;

-- ── Grants ──────────────────────────────────────────────────
revoke all on function private.recompute_enrollment(uuid, text) from public, anon, authenticated;
revoke all on function private.backfill_access_grants() from public, anon, authenticated;
revoke all on function private.course_live_lesson_counts(uuid, text) from public, anon, authenticated;
revoke all on function public.grant_offer_access(uuid, uuid, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.revoke_offer_access(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.revoke_course_access(uuid, text) from public, anon, authenticated;
revoke all on function public.enroll_free(text) from public, anon, authenticated;
revoke all on function public.claim_billing_event(text, text) from public, anon, authenticated;
revoke all on function public.admin_list_students(text, int, int) from public, anon, authenticated;
revoke all on function public.admin_user_emails(uuid[]) from public, anon, authenticated;

grant execute on function public.grant_offer_access(uuid, uuid, text, uuid, timestamptz) to service_role;
grant execute on function public.revoke_offer_access(uuid, uuid, uuid) to service_role;
grant execute on function public.revoke_course_access(uuid, text) to service_role;
grant execute on function public.enroll_free(text) to authenticated;
grant execute on function public.claim_billing_event(text, text) to service_role;
grant execute on function public.admin_list_students(text, int, int) to service_role;
grant execute on function public.admin_user_emails(uuid[]) to service_role;

-- ── 7. Storage limit for downloads ──────────────────────────
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    update storage.buckets set file_size_limit = 209715200 where id = 'lesson-files';
  end if;
end $$;
