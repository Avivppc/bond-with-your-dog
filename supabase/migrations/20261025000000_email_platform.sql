-- Email platform, round two: any trigger (lifecycle, engagement, sales, quiz leads), flow settings
-- (offer, goal, re-entry, smart sending, quiet hours), conditions on member data, campaigns
-- (one-off emails to an audience), unsubscribes by email address (leads have no account), images
-- for the block editor, and a 15-minute schedule through pg_cron.

-- ── Flows: generic trigger + settings ─────────────────────────────────────────
alter table public.email_flows drop constraint if exists email_flows_trigger_check;
update public.email_flows set trigger = 'chapter_progress' where trigger = 'chapter_80';
alter table public.email_flows add column if not exists trigger_params jsonb not null default '{}'::jsonb;
-- The old flows kept their chapter in course_id; it moves into the trigger's settings.
update public.email_flows set trigger_params =
    case when trigger = 'chapter_progress' then jsonb_build_object('percent', 80) else '{}'::jsonb end
    || coalesce(case when course_id is not null then jsonb_build_object('courseId', course_id) end, '{}'::jsonb)
 where trigger in ('chapter_progress', 'chapter_completed') and trigger_params = '{}'::jsonb;
alter table public.email_flows add constraint email_flows_trigger_check check (trigger in (
  'signed_up', 'onboarding_completed', 'chapter_purchased', 'chapter_started', 'chapter_progress', 'chapter_completed',
  'inactive_practice', 'inactive_app', 'lesson_completed', 'feedback_replied',
  'checkout_abandoned', 'purchase_made', 'code_expiring', 'quiz_lead'));
-- What the flow sells (its discount code and {{offer_url}}): {"kind":"none"|"next_chapter"|"chapter"|"abandoned_offer","courseId"?}.
alter table public.email_flows add column if not exists offer jsonb not null default '{"kind": "next_chapter"}'::jsonb;
-- When a member leaves early: {"kind":"none"|"bought_offer"|"any_purchase"|"practiced"|"signed_up"}.
alter table public.email_flows add column if not exists goal jsonb not null default '{"kind": "bought_offer"}'::jsonb;
-- "once": a person enters this flow one time ever; "each_time": every time the trigger happens again.
alter table public.email_flows add column if not exists reentry text not null default 'each_time' check (reentry in ('once', 'each_time'));
-- Skip a flow email when the person got any marketing email within this many hours (0 = off).
alter table public.email_flows add column if not exists smart_sending_hours int not null default 16 check (smart_sending_hours between 0 and 168);
-- Hold emails to 9:00–20:00 in the member's time zone.
alter table public.email_flows add column if not exists quiet_hours boolean not null default true;

-- ── Runs: members or leads, any trigger ───────────────────────────────────────
alter table public.email_flow_runs alter column user_id drop not null;
alter table public.email_flow_runs alter column course_id drop not null;
alter table public.email_flow_runs alter column target_course_id drop not null;
alter table public.email_flow_runs add column if not exists email text;
alter table public.email_flow_runs add column if not exists dedupe_key text not null default '';
alter table public.email_flow_runs add column if not exists context jsonb not null default '{}'::jsonb;
alter table public.email_flow_runs add column if not exists subject_key text generated always as (coalesce(user_id::text, 'lead:' || lower(email))) stored;
update public.email_flow_runs set dedupe_key = coalesce(course_id, '') where dedupe_key = '';
alter table public.email_flow_runs drop constraint if exists email_flow_runs_flow_id_user_id_course_id_key;
create unique index if not exists email_flow_runs_once on public.email_flow_runs (flow_id, subject_key, dedupe_key);
alter table public.email_flow_runs drop constraint if exists email_flow_runs_subject;
alter table public.email_flow_runs add constraint email_flow_runs_subject check (user_id is not null or email is not null);

-- ── Unsubscribes by address (leads too) ───────────────────────────────────────
alter table public.email_unsubscribes drop constraint if exists email_unsubscribes_pkey;
alter table public.email_unsubscribes add column if not exists id uuid not null default gen_random_uuid();
alter table public.email_unsubscribes add primary key (id);
alter table public.email_unsubscribes alter column user_id drop not null;
create unique index if not exists email_unsubscribes_user on public.email_unsubscribes (user_id);
create unique index if not exists email_unsubscribes_email on public.email_unsubscribes (lower(email));

create or replace function public.is_unsubscribed(p_user_id uuid, p_email text)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.email_unsubscribes u
    where (p_user_id is not null and u.user_id = p_user_id)
       or (p_email is not null and lower(u.email) = lower(p_email))
  );
$$;

-- Complaints and hard bounces unsubscribe the address (and the member, when there is one).
create or replace function public.record_email_event(p_provider_id text, p_type text, p_at timestamptz)
returns void language plpgsql set search_path = '' as $$
declare
  v_user uuid;
  v_email text;
begin
  update public.email_messages set
    delivered_at  = case when p_type = 'email.delivered' then coalesce(delivered_at, p_at) else delivered_at end,
    opened_at     = case when p_type in ('email.opened', 'email.clicked') then coalesce(opened_at, p_at) else opened_at end,
    open_count    = open_count + case when p_type = 'email.opened' then 1 else 0 end,
    clicked_at    = case when p_type = 'email.clicked' then coalesce(clicked_at, p_at) else clicked_at end,
    click_count   = click_count + case when p_type = 'email.clicked' then 1 else 0 end,
    bounced_at    = case when p_type = 'email.bounced' then coalesce(bounced_at, p_at) else bounced_at end,
    complained_at = case when p_type = 'email.complained' then coalesce(complained_at, p_at) else complained_at end
  where provider_id = p_provider_id
  returning user_id, to_email into v_user, v_email;

  -- Resend's "bounced" is a hard bounce (the address doesn't exist): mailing it again hurts delivery.
  if p_type in ('email.complained', 'email.bounced') and (v_user is not null or nullif(v_email, '') is not null)
     and not public.is_unsubscribed(v_user, nullif(v_email, '')) then
    insert into public.email_unsubscribes (user_id, email, source)
    values (v_user, nullif(v_email, ''), case when p_type = 'email.bounced' then 'bounce' else 'complaint' end);
  end if;
end;
$$;

-- ── Campaigns ────────────────────────────────────────────────────────────────
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'canceled')),
  -- Who gets it: {"kind": "all_members" | "owns_chapter" | "not_owns_chapter" | "completed_chapter" | "inactive_practice" | "quiz_leads" | "everyone", "courseId"?, "days"?}.
  audience jsonb not null default '{"kind": "all_members"}'::jsonb,
  -- The email (block editor document).
  email jsonb not null,
  scheduled_at timestamptz,
  started_at timestamptz,
  sent_at timestamptz,
  recipients int,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.email_campaigns enable row level security;
-- While a job sends a campaign it holds it until this time, so two jobs never send it at once.
alter table public.email_campaigns add column if not exists locked_until timestamptz;

alter table public.email_messages add column if not exists campaign_id uuid references public.email_campaigns(id) on delete cascade;
create index if not exists email_messages_campaign on public.email_messages (campaign_id);
create unique index if not exists email_messages_campaign_once on public.email_messages (campaign_id, lower(to_email))
  where campaign_id is not null and status in ('queued', 'sent', 'skipped');
-- Smart sending looks back over everyone's recent marketing emails.
create index if not exists email_messages_recent on public.email_messages (lower(to_email), sent_at desc);

-- Recipients for a campaign audience, minus anyone unsubscribed.
create or replace function public.campaign_audience(p_audience jsonb)
returns table (user_id uuid, email text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_kind text := coalesce(p_audience->>'kind', 'all_members');
  v_course text := p_audience->>'courseId';
  v_days int := coalesce((p_audience->>'days')::int, 7);
begin
  return query
  with members as (
    select u.id as user_id, u.email::text as email from auth.users u where u.email is not null
  ), owners as (
    select distinct e.user_id from public.enrollments e
    where e.course_id = v_course and e.access_level = 'full' and (e.expires_at is null or e.expires_at > now())
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
    select null::uuid, q.email from (
      select distinct on (lower(l.email)) l.email from public.quiz_leads l order by lower(l.email), l.created_at desc
    ) q
    where v_kind in ('quiz_leads', 'everyone') and not exists (select 1 from members m where lower(m.email) = lower(q.email))
  )
  select p.user_id, p.email from picked p where not public.is_unsubscribed(p.user_id, p.email);
end;
$$;

-- How many people an audience reaches right now (the admin shows it while choosing).
create or replace function public.campaign_audience_size(p_audience jsonb)
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from public.campaign_audience(p_audience);
$$;

-- When a campaign starts sending: one "queued" message per recipient, all in the database (no row
-- limits on the way). The job then sends the queued messages in batches. Returns how many were added.
create or replace function public.enqueue_campaign(p_campaign_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_campaign public.email_campaigns;
  v_added int;
begin
  select * into v_campaign from public.email_campaigns where id = p_campaign_id;
  if v_campaign.id is null then
    return 0;
  end if;
  insert into public.email_messages (campaign_id, user_id, to_email, subject, status)
  select v_campaign.id, a.user_id, a.email, coalesce(v_campaign.email->>'subject', ''), 'queued'
    from public.campaign_audience(v_campaign.audience) a
   where nullif(a.email, '') is not null
  on conflict do nothing;
  get diagnostics v_added = row_count;
  return v_added;
end;
$$;

-- ── Triggers: who entered a flow's trigger since it went live ──────────────────
-- One row per person and occurrence: dedupe_key separates occurrences (a chapter, an order, a lapse).
create or replace function public.flow_trigger_candidates(p_trigger text, p_params jsonb, p_since timestamptz)
returns table (user_id uuid, email text, dedupe_key text, context jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_course text := p_params->>'courseId';
  v_percent int := coalesce((p_params->>'percent')::int, 80);
  v_days int := coalesce((p_params->>'days')::int, 7);
  v_hours int := coalesce((p_params->>'hours')::int, 2);
begin
  if p_trigger = 'signed_up' then
    return query select u.id, u.email::text, ''::text, '{}'::jsonb from auth.users u where u.created_at >= p_since and u.email is not null;

  elsif p_trigger = 'onboarding_completed' then
    return query select u.id, u.email::text, ''::text, '{}'::jsonb
      from public.profiles p join auth.users u on u.id = p.id where p.onboarded_at >= p_since;

  elsif p_trigger = 'chapter_purchased' then
    return query select u.id, u.email::text, e.course_id, jsonb_build_object('courseId', e.course_id)
      from public.enrollments e join auth.users u on u.id = e.user_id
      where e.enrolled_at >= p_since and e.access_level = 'full' and (v_course is null or e.course_id = v_course);

  elsif p_trigger in ('chapter_started', 'chapter_progress', 'chapter_completed') then
    -- Only people who crossed the line after the flow went live: done_before counts the lessons
    -- finished before then, so someone already past 80% (or started) back then doesn't count.
    -- lesson_progress has no created_at; "started" = some progress now, none finished before go-live,
    -- and the earliest progress row touched since.
    return query
    with progress as (
      select e.user_id as uid, e.course_id as cid,
             count(l.id) filter (where lp.completed_at is not null) as done,
             count(l.id) filter (where lp.completed_at < p_since) as done_before,
             count(l.id) as total,
             max(lp.completed_at) as last_done,
             min(lp.updated_at) as first_seen
      from public.enrollments e
      join public.lessons l on l.course_id = e.course_id and l.published and (l.module_id is null or public.is_module_live(l.module_id))
      left join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = e.user_id
      where (e.expires_at is null or e.expires_at > now()) and (v_course is null or e.course_id = v_course)
      group by e.user_id, e.course_id
    )
    select u.id, u.email::text, p.cid,
           jsonb_build_object('courseId', p.cid, 'targetCourseId',
             (select n.id from public.courses n where n.requires_course_id = p.cid and n.published limit 1))
    from progress p join auth.users u on u.id = p.uid
    where p.total > 0 and case
      when p_trigger = 'chapter_started' then p.first_seen >= p_since and p.done_before = 0
      when p_trigger = 'chapter_completed' then p.done >= p.total and p.done_before < p.total and p.last_done >= p_since
      else p.done * 100 >= p.total * v_percent and p.done_before * 100 < p.total * v_percent and p.last_done >= p_since
    end;

  elsif p_trigger = 'inactive_practice' then
    return query
    with last as (
      select e.user_id as uid, greatest(max(e.enrolled_at)::date, coalesce(max(s.practiced_on), '-infinity'::date)) as last_day
      from public.enrollments e
      left join public.practice_sessions s on s.user_id = e.user_id
      where e.access_level = 'full' and (e.expires_at is null or e.expires_at > now())
      group by e.user_id
    )
    select u.id, u.email::text, l.last_day::text, jsonb_build_object('lastPracticed', l.last_day)
    from last l join auth.users u on u.id = l.uid
    where l.last_day + v_days <= current_date and (l.last_day + v_days)::timestamptz >= date_trunc('day', p_since);

  elsif p_trigger = 'inactive_app' then
    -- Sessions refresh without a new sign-in, so "last seen" is the latest of signing in, watching a
    -- lesson and logging practice.
    return query
    with seen as (
      select u.id as uid, u.email::text as email,
             greatest(u.last_sign_in_at,
                      (select max(lp.updated_at) from public.lesson_progress lp where lp.user_id = u.id),
                      (select max(s.practiced_on)::timestamptz from public.practice_sessions s where s.user_id = u.id)) as last_seen
      from auth.users u
      where u.email is not null
    )
    select s.uid, s.email, s.last_seen::date::text, jsonb_build_object('lastSeen', s.last_seen::date)
      from seen s
      where s.last_seen is not null
        and s.last_seen + make_interval(days => v_days) <= now()
        and s.last_seen + make_interval(days => v_days) >= p_since;

  elsif p_trigger = 'lesson_completed' then
    return query select u.id, u.email::text, lp.lesson_id::text, jsonb_build_object('lessonId', lp.lesson_id, 'courseId', l.course_id)
      from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id join auth.users u on u.id = lp.user_id
      where lp.completed_at >= p_since and (v_course is null or l.course_id = v_course);

  elsif p_trigger = 'feedback_replied' then
    return query select u.id, u.email::text, f.id::text, jsonb_build_object('videoId', f.id)
      from public.feedback_videos f join auth.users u on u.id = f.user_id
      where f.replied_at >= p_since;

  elsif p_trigger = 'checkout_abandoned' then
    -- Several tries at the same checkout on one day are one abandonment (the latest order).
    return query select distinct on (u.id, o.offer_id, o.created_at::date)
        u.id, u.email::text, coalesce(o.offer_id::text, '') || ':' || o.created_at::date::text, jsonb_build_object('orderId', o.id, 'offerId', o.offer_id)
      from public.orders o join auth.users u on u.id = o.user_id
      where o.status in ('pending', 'canceled', 'failed') and o.created_at >= p_since
        and o.created_at <= now() - make_interval(hours => v_hours)
        and not exists (select 1 from public.orders paid where paid.user_id = o.user_id and paid.offer_id = o.offer_id and paid.status = 'paid')
      order by u.id, o.offer_id, o.created_at::date, o.created_at desc;

  elsif p_trigger = 'purchase_made' then
    return query select u.id, u.email::text, o.id::text, jsonb_build_object('orderId', o.id, 'offerId', o.offer_id)
      from public.orders o join auth.users u on u.id = o.user_id
      where o.status = 'paid' and o.paid_at >= p_since;

  elsif p_trigger = 'code_expiring' then
    return query select u.id, u.email::text, d.id::text, jsonb_build_object('codeId', d.id, 'targetCourseId', d.course_id)
      from public.discount_codes d join auth.users u on u.id = d.user_id
      where d.redeemed_at is null and d.expires_at > now() and d.expires_at <= now() + make_interval(days => v_days)
        and d.expires_at - make_interval(days => v_days) >= p_since;

  elsif p_trigger = 'quiz_lead' then
    return query select null::uuid, q.email, ''::text, jsonb_build_object('tier', q.tier, 'firstName', q.first_name)
      from (select distinct on (lower(l.email)) l.* from public.quiz_leads l where l.created_at >= p_since order by lower(l.email), l.created_at desc) q
      where not exists (select 1 from auth.users u where lower(u.email) = lower(q.email));
  end if;
end;
$$;

-- The member account for an address (a quiz lead who later signed up), or null.
create or replace function public.user_id_for_email(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;
revoke execute on function public.user_id_for_email(text) from public, anon, authenticated;
grant execute on function public.user_id_for_email(text) to service_role;

-- The next people to enrol in a flow: trigger candidates who aren't in it yet, a page at a time
-- (the job calls again until a page comes back short). "once" flows match any earlier entry.
create or replace function public.flow_new_candidates(p_flow_id uuid, p_limit int default 500)
returns table (user_id uuid, email text, dedupe_key text, context jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_flow public.email_flows;
begin
  select * into v_flow from public.email_flows f where f.id = p_flow_id;
  if v_flow.id is null or v_flow.live_since is null then
    return;
  end if;
  return query
  select c.user_id, c.email, c.dedupe_key, c.context
    from public.flow_trigger_candidates(v_flow.trigger, v_flow.trigger_params, v_flow.live_since) c
   where (c.user_id is not null or nullif(c.email, '') is not null)
     and not exists (
       select 1 from public.email_flow_runs r
        where r.flow_id = v_flow.id
          and r.subject_key = coalesce(c.user_id::text, 'lead:' || lower(c.email))
          and r.dedupe_key = case when v_flow.reentry = 'once' then '' else c.dedupe_key end)
   order by c.user_id nulls last, lower(c.email), c.dedupe_key
   limit greatest(1, least(coalesce(p_limit, 500), 1000));
end;
$$;
revoke execute on function public.flow_new_candidates(uuid, int) from public, anon, authenticated;
grant execute on function public.flow_new_candidates(uuid, int) to service_role;
revoke execute on function public.campaign_audience_size(jsonb) from public, anon, authenticated;
grant execute on function public.campaign_audience_size(jsonb) to service_role;
revoke execute on function public.enqueue_campaign(uuid) from public, anon, authenticated;
grant execute on function public.enqueue_campaign(uuid) to service_role;

revoke execute on function public.flow_trigger_candidates(text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.flow_trigger_candidates(text, jsonb, timestamptz) to service_role;
revoke execute on function public.campaign_audience(jsonb) from public, anon, authenticated;
grant execute on function public.campaign_audience(jsonb) to service_role;
revoke execute on function public.is_unsubscribed(uuid, text) from public, anon, authenticated;
grant execute on function public.is_unsubscribed(uuid, text) to service_role;

-- ── Images for the email editor (public: they're shown in inboxes) ─────────────
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('email-assets', 'email-assets', true, 2097152, array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;

-- ── Every 15 minutes: ping the flows job ─────────────────────────────────────
-- The site address and the CRON_SECRET live in Supabase Vault (names 'flows_cron_url' and
-- 'cron_secret'); without both the job does nothing, so local databases never call production.

create or replace function private.ping_flows()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'flows_cron_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_get(url := v_url, headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret), timeout_milliseconds := 60000);
end;
$$;
revoke execute on function private.ping_flows() from public, anon, authenticated;

-- Only where the extensions exist (Supabase); the plain Postgres used by the SQL tests skips it.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'email-flows-every-15-min';
    perform cron.schedule('email-flows-every-15-min', '*/15 * * * *', 'select private.ping_flows()');
  end if;
end $$;
