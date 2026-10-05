-- Smarter automations: several exit conditions per flow, pausing / resuming / removing one person,
-- flows that remember when they were paused, and campaigns that arrive at the same local time for
-- everyone ("10:00 in each person's time zone").

-- ── Exit conditions (replace the single goal) ─────────────────────────────────
alter table public.email_flows add column if not exists exit_conditions jsonb
  check (exit_conditions is null or jsonb_typeof(exit_conditions) = 'array');
update public.email_flows
   set exit_conditions = case when coalesce(goal->>'kind', 'none') = 'none' then '[]'::jsonb else jsonb_build_array(jsonb_build_object('kind', goal->>'kind')) end
 where exit_conditions is null;

-- When a flow was paused (to say on resume who triggered meanwhile).
alter table public.email_flows add column if not exists paused_at timestamptz;

-- ── One person can be paused (the job skips them until resumed) ───────────────
alter table public.email_flow_runs drop constraint if exists email_flow_runs_status_check;
alter table public.email_flow_runs add constraint email_flow_runs_status_check
  check (status in ('active', 'waiting', 'paused', 'done', 'exited'));

-- ── Campaigns at a local time ─────────────────────────────────────────────────
-- local_time: scheduled_local ("2026-10-05T10:00") is the wall-clock time in each person's zone;
-- people without a zone use fallback_zone. Each message carries when it may go out.
alter table public.email_campaigns add column if not exists local_time boolean not null default false;
alter table public.email_campaigns add column if not exists scheduled_local text
  check (scheduled_local is null or scheduled_local ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$');
alter table public.email_campaigns add column if not exists fallback_zone text;
alter table public.email_messages add column if not exists send_after timestamptz;
create index if not exists email_messages_campaign_due on public.email_messages (campaign_id, send_after) where status = 'queued';

-- A valid IANA zone name, else null.
create or replace function private.valid_zone(p_zone text)
returns text language sql stable set search_path = '' as $$
  select z.name from pg_catalog.pg_timezone_names z where z.name = p_zone limit 1;
$$;

create or replace function public.enqueue_campaign(p_campaign_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_campaign public.email_campaigns;
  v_added int;
  v_fallback text;
begin
  select * into v_campaign from public.email_campaigns where id = p_campaign_id;
  if v_campaign.id is null then
    return 0;
  end if;
  v_fallback := coalesce(private.valid_zone(v_campaign.fallback_zone), 'UTC');
  insert into public.email_messages (campaign_id, user_id, to_email, subject, status, send_after)
  select v_campaign.id, a.user_id, a.email, coalesce(v_campaign.email->>'subject', ''), 'queued',
         case
           when v_campaign.local_time and v_campaign.scheduled_local is not null then
             (v_campaign.scheduled_local::timestamp at time zone coalesce(
                private.valid_zone((select p.timezone from public.profiles p where p.id = a.user_id)), v_fallback))
           else now()
         end
    from public.campaign_audience(v_campaign.audience) a
   where nullif(a.email, '') is not null
  on conflict do nothing;
  get diagnostics v_added = row_count;
  return v_added;
end;
$$;
