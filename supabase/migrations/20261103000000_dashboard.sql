-- Admin dashboard: the last 24 hours at a glance, a recent-activity feed, and a heartbeat for the
-- scheduled jobs so the dashboard can say when automations stopped running.

-- 1. Job heartbeats: each cron route records its last good run and its last failure.
create table if not exists public.job_runs (
  job text primary key check (job in ('flows', 'reminders')),
  last_ok_at timestamptz,
  last_error_at timestamptz,
  last_error text check (char_length(last_error) <= 500)
);
alter table public.job_runs enable row level security;
-- No policies: only the service role reads and writes it.

-- 2. The last 24 hours next to the 24 hours before, one row per number.
create or replace function public.admin_last_day(p_currency text)
returns table (metric text, current_value bigint, previous_value bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with w as (select now() as t_end, now() - interval '24 hours' as t_mid, now() - interval '48 hours' as t_start)
  select 'signups', count(*) filter (where p.created_at >= w.t_mid), count(*) filter (where p.created_at < w.t_mid)
    from public.profiles p, w where p.created_at >= w.t_start and p.created_at < w.t_end
  union all
  select 'leads', count(*) filter (where l.created_at >= w.t_mid), count(*) filter (where l.created_at < w.t_mid)
    from public.quiz_leads l, w where l.created_at >= w.t_start and l.created_at < w.t_end
  union all
  select 'orders', count(*) filter (where o.paid_at >= w.t_mid), count(*) filter (where o.paid_at < w.t_mid)
    from public.orders o, w
   where o.paid_at >= w.t_start and o.paid_at < w.t_end and o.status in ('paid', 'refunded') and o.amount_cents > 0
  union all
  select 'revenue',
         coalesce(sum(o.amount_cents) filter (where o.paid_at >= w.t_mid), 0)::bigint,
         coalesce(sum(o.amount_cents) filter (where o.paid_at < w.t_mid), 0)::bigint
    from public.orders o, w
   where o.paid_at >= w.t_start and o.paid_at < w.t_end and o.status in ('paid', 'refunded') and upper(o.currency) = upper(p_currency)
  union all
  select 'lessons', count(*) filter (where lp.completed_at >= w.t_mid), count(*) filter (where lp.completed_at < w.t_mid)
    from public.lesson_progress lp, w where lp.completed_at >= w.t_start and lp.completed_at < w.t_end
  union all
  select 'practice', count(*) filter (where s.created_at >= w.t_mid), count(*) filter (where s.created_at < w.t_mid)
    from public.practice_sessions s, w where s.created_at >= w.t_start and s.created_at < w.t_end;
$$;

-- 3. What people did lately, newest first, across the academy.
create or replace function public.admin_recent_activity(p_limit int)
returns table (
  kind text,
  at timestamptz,
  user_id uuid,
  email text,
  full_name text,
  detail text,
  amount_cents int,
  currency text
)
language sql
stable
security definer
set search_path = ''
as $$
  with lim as (select least(greatest(coalesce(p_limit, 20), 1), 100) as n),
  events as (
    (select 'signup'::text as kind, p.created_at as at, p.id as user_id, null::text as lead_email, null::text as lead_name,
            null::text as detail, null::int as amount_cents, null::text as currency
       from public.profiles p order by p.created_at desc limit (select n from lim))
    union all
    (select 'lead', l.created_at, null, l.email, l.first_name, l.tier, null, null
       from public.quiz_leads l order by l.created_at desc limit (select n from lim))
    union all
    (select 'order', o.paid_at, o.user_id, null, null, f.title, o.amount_cents, o.currency
       from public.orders o join public.offers f on f.id = o.offer_id
      where o.paid_at is not null and o.status in ('paid', 'refunded')
      order by o.paid_at desc limit (select n from lim))
    union all
    (select 'lesson', lp.completed_at, lp.user_id, null, null, le.title, null, null
       from public.lesson_progress lp join public.lessons le on le.id = lp.lesson_id
      where lp.completed_at is not null
      order by lp.completed_at desc limit (select n from lim))
    union all
    (select 'video', v.created_at, v.user_id, null, null, v.title, null, null
       from public.feedback_videos v where v.status in ('waiting', 'replied')
      order by v.created_at desc limit (select n from lim))
    union all
    (select 'question', q.created_at, q.user_id, null, null, le.title, null, null
       from public.lesson_questions q join public.lessons le on le.id = q.lesson_id
      order by q.created_at desc limit (select n from lim))
    union all
    (select 'survey', r.created_at, r.user_id, null, null, s.title, null, null
       from public.survey_responses r join public.surveys s on s.id = r.survey_id
      order by r.created_at desc limit (select n from lim))
  )
  select e.kind, e.at, e.user_id, coalesce(u.email, e.lead_email)::text, coalesce(pr.full_name, e.lead_name),
         e.detail, e.amount_cents, e.currency
    from events e
    left join auth.users u on u.id = e.user_id
    left join public.profiles pr on pr.id = e.user_id
   order by e.at desc
   limit (select n from lim);
$$;

revoke all on function public.admin_last_day(text) from public, anon, authenticated;
revoke all on function public.admin_recent_activity(int) from public, anon, authenticated;
grant execute on function public.admin_last_day(text) to service_role;
grant execute on function public.admin_recent_activity(int) to service_role;
