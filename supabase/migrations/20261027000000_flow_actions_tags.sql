-- Automations: action steps in flows (give/take back a chapter, tags, notify the team, webhooks),
-- contact tags, campaigns to a tag.

-- ── Tags on contacts (members and quiz leads alike, by address) ────────────────
create table if not exists public.contact_tags (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 320),
  user_id uuid references auth.users(id) on delete cascade,
  tag text not null check (tag ~ '^[a-z0-9][a-z0-9 -]{0,39}$'),
  -- 'flow:<id>' or 'admin'
  source text not null default 'admin',
  created_at timestamptz not null default now()
);
create unique index if not exists contact_tags_once on public.contact_tags (lower(email), tag);
create index if not exists contact_tags_tag on public.contact_tags (tag);
alter table public.contact_tags enable row level security;

-- ── What each action step did, once per person ────────────────────────────────
create table if not exists public.email_flow_actions (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid references public.email_flows(id) on delete set null,
  run_id uuid not null references public.email_flow_runs(id) on delete cascade,
  node_id text not null,
  action text not null,
  status text not null check (status in ('done', 'skipped', 'failed')),
  detail text,
  created_at timestamptz not null default now()
);
-- A step that worked (or was skipped on purpose) never runs again for that person; failures retry.
create unique index if not exists email_flow_actions_once on public.email_flow_actions (run_id, node_id) where status in ('done', 'skipped');
create index if not exists email_flow_actions_flow on public.email_flow_actions (flow_id, node_id);
alter table public.email_flow_actions enable row level security;

-- ── Chapters a flow gives ──────────────────────────────────────────────────────
alter table public.enrollments drop constraint if exists enrollments_source_check;
alter table public.enrollments add constraint enrollments_source_check
  check (source in ('free', 'grant', 'order', 'subscription', 'legacy', 'flow'));

-- ── Where team notifications go ────────────────────────────────────────────────
alter table public.email_settings add column if not exists team_email text
  check (team_email is null or team_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- ── Campaigns to a tag ────────────────────────────────────────────────────────
create or replace function public.campaign_audience(p_audience jsonb)
returns table (user_id uuid, email text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_kind text := coalesce(p_audience->>'kind', 'all_members');
  v_course text := p_audience->>'courseId';
  v_days int := coalesce((p_audience->>'days')::int, 7);
  v_tag text := lower(btrim(coalesce(p_audience->>'tag', '')));
begin
  return query
  with members as (
    select u.id as user_id, u.email::text as email from auth.users u where u.email is not null
  ), owners as (
    select distinct e.user_id from public.enrollments e
    where e.course_id = v_course and e.access_level = 'full' and (e.expires_at is null or e.expires_at > now())
  ), leads as (
    select q.email from (
      select distinct on (lower(l.email)) l.email from public.quiz_leads l order by lower(l.email), l.created_at desc
    ) q
    where not exists (select 1 from members m where lower(m.email) = lower(q.email))
  ), picked as (
    select m.user_id, m.email from members m where v_kind in ('all_members', 'everyone')
    union
    select m.user_id, m.email from members m where v_kind = 'owns_chapter' and m.user_id in (select o.user_id from owners o)
    union
    select m.user_id, m.email from members m where v_kind = 'not_owns_chapter' and m.user_id not in (select o.user_id from owners o)
    union
    select m.user_id, m.email from members m where v_kind = 'completed_chapter' and exists (
      select 1 from public.certificates c where c.user_id = m.user_id and c.course_id = v_course)
    union
    select m.user_id, m.email from members m where v_kind = 'inactive_practice'
      and exists (select 1 from public.enrollments e where e.user_id = m.user_id and (e.expires_at is null or e.expires_at > now()))
      and not exists (select 1 from public.practice_sessions s where s.user_id = m.user_id and s.practiced_on > current_date - v_days)
    union
    select null::uuid, l.email from leads l where v_kind in ('quiz_leads', 'everyone')
    union
    select m.user_id, m.email from members m where v_kind = 'has_tag'
      and exists (select 1 from public.contact_tags t where t.tag = v_tag and lower(t.email) = lower(m.email))
    union
    select null::uuid, l.email from leads l where v_kind = 'has_tag'
      and exists (select 1 from public.contact_tags t where t.tag = v_tag and lower(t.email) = lower(l.email))
  )
  select p.user_id, p.email from picked p where public.can_market(p.user_id, p.email);
end;
$$;
