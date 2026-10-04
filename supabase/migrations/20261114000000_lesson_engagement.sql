-- Admin → Course → Engagement: how students watch each lesson.
-- Per lesson: how many students opened it, how many finished it, how much of the video they played
-- on average (played_seconds, from 20261112000000_watch_to_complete), and where those who didn't
-- finish usually stopped (the median furthest point). The team's own progress is left out.

create or replace function public.admin_lesson_engagement(p_course_id text)
returns table (
  lesson_id uuid,
  video_seconds int,
  viewers bigint,
  completed bigint,
  avg_watched_pct numeric,
  median_stop_seconds int
)
language sql
stable
security definer
set search_path = ''
as $$
  with progress as (
    select lp.lesson_id, lp.watch_seconds, lp.played_seconds, lp.completed_at
      from public.lesson_progress lp
      join public.lessons l on l.id = lp.lesson_id
     where l.course_id = p_course_id
       and not exists (select 1 from public.staff_members s where s.user_id = lp.user_id)
       and (lp.watch_seconds > 0 or lp.played_seconds > 0 or lp.completed_at is not null)
  )
  select l.id,
         v.duration_seconds,
         count(p.lesson_id),
         count(p.completed_at),
         case when coalesce(v.duration_seconds, 0) > 0 and count(p.lesson_id) > 0
              -- Completions from before played time was measured (played_seconds 0) count as fully watched.
              then round(avg(least(greatest(p.played_seconds,
                                            case when p.completed_at is not null and p.played_seconds = 0 then v.duration_seconds else 0 end)::numeric
                                   / v.duration_seconds, 1)) * 100, 1) end,
         (percentile_cont(0.5) within group (order by p.watch_seconds) filter (where p.completed_at is null))::int
    from public.lessons l
    left join public.lesson_videos v on v.lesson_id = l.id
    left join progress p on p.lesson_id = l.id
   where l.course_id = p_course_id
   group by l.id, v.duration_seconds;
$$;

revoke all on function public.admin_lesson_engagement(text) from public, anon, authenticated;
grant execute on function public.admin_lesson_engagement(text) to service_role;
