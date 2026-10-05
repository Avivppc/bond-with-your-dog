-- Email flows (Klaviyo-style automations) for selling the next chapter to existing members:
-- the flow graph, each member's run through it, every email sent with its delivery/open/click
-- state (from Resend webhooks), personal discount codes, and unsubscribes.
-- All tables are server-only: the admin and the cron use the service role after their own checks.

create table if not exists public.email_flows (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'live', 'paused')),
  trigger text not null check (trigger in ('chapter_80', 'chapter_completed')),
  -- The chapter whose progress starts the flow; null = any chapter that has a next chapter.
  course_id text references public.courses(id) on delete set null,
  -- The personal code each member gets (null = no discount in this flow).
  discount_percent int check (discount_percent between 1 and 90),
  discount_valid_days int check (discount_valid_days between 1 and 90),
  graph jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  -- Only members who reach the trigger after this moment enter (no blast to old completers).
  live_since timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((discount_percent is null) = (discount_valid_days is null))
);

create table if not exists public.email_flow_runs (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.email_flows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  target_course_id text not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'waiting', 'done', 'exited')),
  node_id text not null,
  wait_until timestamptz,
  last_email_node_id text,
  exit_reason text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  -- Set while a job is moving this run; a stale lease (crashed job) expires after 10 minutes.
  claimed_at timestamptz,
  unique (flow_id, user_id, course_id)
);
create index if not exists email_flow_runs_due on public.email_flow_runs (status, wait_until) where status in ('active', 'waiting');

create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid references public.email_flows(id) on delete set null,
  run_id uuid references public.email_flow_runs(id) on delete cascade,
  node_id text,
  variant text,
  user_id uuid references auth.users(id) on delete set null,
  to_email text not null,
  subject text not null,
  provider_id text unique,
  status text not null default 'sent' check (status in ('queued', 'sent', 'failed', 'skipped')),
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  open_count int not null default 0,
  click_count int not null default 0
);
create index if not exists email_messages_flow on public.email_messages (flow_id, node_id);
create index if not exists email_messages_run on public.email_messages (run_id, node_id);
-- One delivery per member per email step (failed attempts don't count, so they are retried).
create unique index if not exists email_messages_once on public.email_messages (run_id, node_id) where run_id is not null and status in ('queued', 'sent', 'skipped');

-- Raw webhook events, deduplicated by the delivery id Resend signs (svix-id).
create table if not exists public.email_events (
  id bigint generated always as identity primary key,
  delivery_id text not null unique,
  provider_id text,
  type text not null,
  payload jsonb not null,
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  percent int not null check (percent between 1 and 90),
  expires_at timestamptz not null,
  flow_id uuid references public.email_flows(id) on delete set null,
  redeemed_at timestamptz,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists discount_codes_owner on public.discount_codes (user_id, course_id);
create unique index if not exists discount_codes_one_per_flow on public.discount_codes (user_id, course_id, flow_id) nulls not distinct;

create table if not exists public.email_unsubscribes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  source text not null default 'link',
  unsubscribed_at timestamptz not null default now()
);

alter table public.orders add column if not exists discount_code_id uuid references public.discount_codes(id) on delete set null;
-- A personal flow code is a third kind of order discount, next to the referral ones.
alter table public.orders drop constraint if exists orders_discount_kind_check;
alter table public.orders add constraint orders_discount_kind_check check (discount_kind in ('friend', 'reward', 'upsell'));
create unique index if not exists orders_one_per_code on public.orders (discount_code_id) where discount_code_id is not null and status in ('pending', 'paid');

alter table public.email_flows enable row level security;
alter table public.email_flow_runs enable row level security;
alter table public.email_messages enable row level security;
alter table public.email_events enable row level security;
alter table public.discount_codes enable row level security;
alter table public.email_unsubscribes enable row level security;

-- One Resend webhook event onto its email: timestamps once, counters every time. A click also counts
-- as an open (image blocking hides many opens); a spam complaint unsubscribes the member.
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

  if p_type = 'email.complained' and v_user is not null then
    insert into public.email_unsubscribes (user_id, email, source) values (v_user, v_email, 'complaint')
    on conflict (user_id) do nothing;
  end if;
end;
$$;
revoke execute on function public.record_email_event(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_email_event(text, text, timestamptz) to service_role;

-- A Resend webhook delivery, stored and applied in one transaction: a retry after a failure
-- applies it again; a retry after success is a no-op. Returns false for a duplicate.
create or replace function public.apply_email_webhook(p_delivery_id text, p_provider_id text, p_type text, p_payload jsonb, p_at timestamptz)
returns boolean language plpgsql set search_path = '' as $$
begin
  insert into public.email_events (delivery_id, provider_id, type, payload, occurred_at)
  values (p_delivery_id, p_provider_id, p_type, p_payload, p_at)
  on conflict (delivery_id) do nothing;
  if not found then
    return false;
  end if;
  if p_provider_id is not null and p_type in ('email.delivered', 'email.opened', 'email.clicked', 'email.bounced', 'email.complained') then
    perform public.record_email_event(p_provider_id, p_type, p_at);
  end if;
  return true;
end;
$$;
revoke execute on function public.apply_email_webhook(text, text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_email_webhook(text, text, text, jsonb, timestamptz) to service_role;

-- Members who reached a flow's trigger since it went live and don't own the next chapter yet.
-- "chapter_80": at least 80% of the chapter's published lessons done; "chapter_completed": all.
create or replace function public.flow_candidates(p_trigger text, p_course_id text, p_since timestamptz)
returns table (user_id uuid, course_id text, target_course_id text)
language sql stable set search_path = '' as $$
  with progress as (
    select e.user_id, e.course_id,
           count(l.id) filter (where lp.completed_at is not null) as done,
           count(l.id) as total,
           max(lp.completed_at) as last_done
    from public.enrollments e
    -- The lessons a member actually sees (as the app counts them): published, in a live module.
    join public.lessons l on l.course_id = e.course_id and l.published
                         and (l.module_id is null or public.is_module_live(l.module_id))
    left join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = e.user_id
    where (e.expires_at is null or e.expires_at > now())
      and (p_course_id is null or e.course_id = p_course_id)
    group by e.user_id, e.course_id
  )
  select p.user_id, p.course_id, nxt.id
  from progress p
  join public.courses nxt on nxt.requires_course_id = p.course_id and nxt.published
  where p.total > 0
    and p.last_done >= p_since
    and case when p_trigger = 'chapter_completed' then p.done >= p.total else p.done * 10 >= p.total * 8 end
    and not exists (
      select 1 from public.enrollments o
      where o.user_id = p.user_id and o.course_id = nxt.id and o.access_level = 'full'
        and (o.expires_at is null or o.expires_at > now())
    );
$$;
revoke execute on function public.flow_candidates(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.flow_candidates(text, text, timestamptz) to service_role;
