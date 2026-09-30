-- Per-course counts for the admin course list (Kajabi-style "Members" column):
-- active students (unexpired enrollments), lessons and modules including drafts.
-- One query instead of pulling every enrollment row into the app.

create or replace function public.admin_course_stats()
returns table (course_id text, active_students bigint, lessons bigint, modules bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    (select count(*) from public.enrollments e
      where e.course_id = c.id and (e.expires_at is null or e.expires_at > now())),
    (select count(*) from public.lessons l where l.course_id = c.id),
    (select count(*) from public.modules m where m.course_id = c.id)
  from public.courses c;
$$;

revoke all on function public.admin_course_stats() from public, anon, authenticated;
grant execute on function public.admin_course_stats() to service_role;
