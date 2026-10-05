-- Phone notifications (Web Push). Every in-app notification can also reach the member's phone:
-- each device that turned it on keeps a subscription here, and the server sends a notification
-- the first time it claims it (pushed_at). Reads and writes go through the server (service role
-- after auth.getUser), so clients get no direct access.

-- ── 1. Device subscriptions ─────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- The push service's address for this browser; one device belongs to whoever enabled it last.
  -- Only the browsers' push services (Google, Mozilla, Apple, Microsoft): the server POSTs here.
  endpoint text not null unique check (
    char_length(endpoint) <= 1000
    and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.(push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com))/'
  ),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- ── 2. Which notifications went out ─────────────────────────────
alter table public.notifications add column if not exists pushed_at timestamptz;
create index if not exists notifications_unpushed_idx on public.notifications (created_at) where pushed_at is null;

-- ── 3. Claim what to push, atomically ───────────────────────────
-- Marks recent, not-yet-pushed notifications (of one member, or everyone when p_user is null) and
-- returns them, so two senders never push the same one. Achievements are left out: the member
-- earns them in the app. Older notifications are never pushed late.
create or replace function public.claim_push_notifications(p_user uuid, p_window_minutes int, p_limit int)
returns table (id uuid, user_id uuid, kind text, title text, body text, href text)
language sql security definer set search_path = '' as $$
  update public.notifications n
     set pushed_at = now()
   where n.id in (
           select c.id
             from public.notifications c
            where c.pushed_at is null
              and c.kind <> 'achievement'
              and c.created_at > now() - make_interval(mins => greatest(p_window_minutes, 1))
              and (p_user is null or c.user_id = p_user)
            order by c.created_at
            limit greatest(least(p_limit, 1000), 1)
            for update skip locked
         )
     and n.pushed_at is null
  returning n.id, n.user_id, n.kind, n.title, n.body, n.href;
$$;

revoke all on function public.claim_push_notifications(uuid, int, int) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(uuid, int, int) to service_role;
