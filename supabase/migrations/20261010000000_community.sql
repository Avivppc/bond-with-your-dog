-- ============================================================
-- Community (Kajabi Communities): channels, posts (image / poll), comments with one level of
-- replies, likes, reports, scheduled posts, an approval queue, challenges with steps, meetups
-- with RSVPs, and a points leaderboard.
--   Members: staff, anyone with an active course (setting), or an offer that includes the community.
--   Reads go through RLS (can_access_community); member writes only through the RPCs below so the
--   web app and the mobile app share one set of rules. Staff moderation runs server-side.
-- Tests: supabase/tests/community.test.sql
-- ============================================================

create table if not exists public.community_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Bonded Community' check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  cover_image_url text,
  guidelines text check (char_length(guidelines) <= 4000),
  open_to_students boolean not null default true,
  require_approval boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.community_settings (id) values (1) on conflict (id) do nothing;

alter table public.offers add column if not exists includes_community boolean not null default false;

create table if not exists public.community_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  source text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists community_grants_order_key on public.community_grants (user_id, order_id) where order_id is not null;
create index if not exists community_grants_live on public.community_grants (user_id) where revoked_at is null;

create or replace function public.can_access_community()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.current_staff_role() is not null
    or exists (select 1 from public.community_grants g
                where g.user_id = auth.uid() and g.revoked_at is null and (g.expires_at is null or g.expires_at > now()))
    or ((select open_to_students from public.community_settings where id = 1)
        and exists (select 1 from public.enrollments e
                     where e.user_id = auth.uid() and (e.expires_at is null or e.expires_at > now())))
  );
$$;

-- ── Content tables ──────────────────────────────────────────
create table if not exists public.community_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  description text check (char_length(description) <= 300),
  default_view text not null default 'feed' check (default_view in ('feed', 'forum', 'gallery')),
  posting text not null default 'members' check (posting in ('members', 'staff')),
  requires_approval boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
insert into public.community_channels (name, slug, description, default_view, posting, position) values
  ('General', 'general', 'Say hi, share progress and ask anything.', 'feed', 'members', 1),
  ('Q&A', 'qa', 'Questions for the coaches and the community.', 'forum', 'members', 2),
  ('Wins', 'wins', 'Photos of your best moments together.', 'gallery', 'members', 3),
  ('Announcements', 'announcements', 'News from the Bonded team.', 'feed', 'staff', 0)
on conflict (slug) do nothing;

create table if not exists public.community_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 4000),
  cover_image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  points int not null default 100 check (points between 0 and 10000),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create table if not exists public.community_challenge_steps (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.community_challenges(id) on delete cascade,
  position int not null default 0,
  title text not null check (char_length(title) between 1 and 160),
  body text check (char_length(body) <= 4000),
  created_at timestamptz not null default now()
);
create table if not exists public.community_challenge_participants (
  challenge_id uuid not null references public.community_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (challenge_id, user_id)
);
create table if not exists public.community_step_completions (
  step_id uuid not null references public.community_challenge_steps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (step_id, user_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.community_channels(id) on delete set null,
  challenge_id uuid references public.community_challenges(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text check (char_length(title) <= 200),
  body text not null check (char_length(body) between 1 and 20000),
  image_path text check (char_length(image_path) <= 300),
  poll_options jsonb,
  status text not null default 'published' check (status in ('published', 'pending', 'scheduled', 'removed')),
  publish_at timestamptz not null default now(),
  pinned boolean not null default false,
  comments_locked boolean not null default false,
  like_count int not null default 0,
  comment_count int not null default 0,
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_posts_feed on public.community_posts (publish_at desc) where status in ('published', 'scheduled');
create index if not exists community_posts_channel on public.community_posts (channel_id, publish_at desc);
create index if not exists community_posts_challenge on public.community_posts (challenge_id, publish_at desc);
create index if not exists community_posts_author on public.community_posts (author_id);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.community_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  like_count int not null default 0,
  removed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists community_comments_post on public.community_comments (post_id, created_at);

create table if not exists public.community_likes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id) = 1),
  unique (user_id, post_id),
  unique (user_id, comment_id)
);

create table if not exists public.community_poll_votes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index int not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_reports (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_meetups (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 4000),
  starts_at timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes between 5 and 720),
  location text check (char_length(location) <= 200),
  meeting_url text check (meeting_url ~ '^https://'),
  cover_image_url text,
  published boolean not null default true,
  canceled boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.community_rsvps (
  meetup_id uuid not null references public.community_meetups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

create table if not exists public.community_points (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  points int not null,
  reason text not null,
  source_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, source_id)
);
create index if not exists community_points_user on public.community_points (user_id, created_at);

-- ── RLS: members read, nobody writes directly ───────────────
do $$
declare
  t text;
begin
  foreach t in array array['community_settings', 'community_grants', 'community_channels', 'community_challenges',
                           'community_challenge_steps', 'community_challenge_participants', 'community_step_completions',
                           'community_posts', 'community_comments', 'community_likes', 'community_poll_votes',
                           'community_reports', 'community_meetups', 'community_rsvps', 'community_points'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
    execute format('revoke select on public.%I from anon', t);
  end loop;
end $$;
revoke select on public.community_grants, public.community_reports, public.community_points from authenticated;

create or replace function private.community_post_live(p_status text, p_publish_at timestamptz)
returns boolean language sql immutable as $$
  select p_status = 'published' or (p_status = 'scheduled' and p_publish_at <= now());
$$;

drop policy if exists community_settings_read on public.community_settings;
create policy community_settings_read on public.community_settings for select to authenticated using (public.can_access_community());
drop policy if exists community_channels_read on public.community_channels;
create policy community_channels_read on public.community_channels for select to authenticated using (public.can_access_community());
drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts for select to authenticated
  using (public.can_access_community()
         and (private.community_post_live(status, publish_at) or author_id = auth.uid() or public.current_staff_role() is not null)
         and status <> 'removed');
drop policy if exists community_comments_read on public.community_comments;
create policy community_comments_read on public.community_comments for select to authenticated
  using (public.can_access_community() and not removed);
drop policy if exists community_likes_read_own on public.community_likes;
create policy community_likes_read_own on public.community_likes for select to authenticated using (user_id = auth.uid());
drop policy if exists community_votes_read_own on public.community_poll_votes;
create policy community_votes_read_own on public.community_poll_votes for select to authenticated using (user_id = auth.uid());
drop policy if exists community_challenges_read on public.community_challenges;
create policy community_challenges_read on public.community_challenges for select to authenticated
  using (public.can_access_community() and (published or public.current_staff_role() is not null));
drop policy if exists community_steps_read on public.community_challenge_steps;
create policy community_steps_read on public.community_challenge_steps for select to authenticated using (public.can_access_community());
drop policy if exists community_participants_read on public.community_challenge_participants;
create policy community_participants_read on public.community_challenge_participants for select to authenticated using (public.can_access_community());
drop policy if exists community_completions_read_own on public.community_step_completions;
create policy community_completions_read_own on public.community_step_completions for select to authenticated using (user_id = auth.uid());
drop policy if exists community_meetups_read on public.community_meetups;
create policy community_meetups_read on public.community_meetups for select to authenticated
  using (public.can_access_community() and (published or public.current_staff_role() is not null));
drop policy if exists community_rsvps_read on public.community_rsvps;
create policy community_rsvps_read on public.community_rsvps for select to authenticated using (public.can_access_community());

-- ── Counters ────────────────────────────────────────────────
create or replace function private.community_like_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.post_id is not null then update public.community_posts set like_count = like_count + 1 where id = new.post_id;
    else update public.community_comments set like_count = like_count + 1 where id = new.comment_id; end if;
    return new;
  end if;
  if old.post_id is not null then update public.community_posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  else update public.community_comments set like_count = greatest(0, like_count - 1) where id = old.comment_id; end if;
  return old;
end;
$$;
drop trigger if exists trg_community_like_counter on public.community_likes;
create trigger trg_community_like_counter after insert or delete on public.community_likes
  for each row execute function private.community_like_counter();

create or replace function private.community_comment_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and not new.removed then
    update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'UPDATE' and new.removed and not old.removed then
    update public.community_posts set comment_count = greatest(0, comment_count - 1) where id = new.post_id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_community_comment_counter on public.community_comments;
create trigger trg_community_comment_counter after insert or update of removed on public.community_comments
  for each row execute function private.community_comment_counter();

-- ── Points (Kajabi-style gamification; daily caps stop farming) ──
create or replace function private.community_award(p_user uuid, p_reason text, p_source text, p_points int, p_daily_cap int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_points <= 0 then return; end if;
  if p_daily_cap is not null and (
    select count(*) from public.community_points
     where user_id = p_user and reason = p_reason and created_at >= date_trunc('day', now())
  ) >= p_daily_cap then
    return;
  end if;
  insert into public.community_points (user_id, points, reason, source_id)
  values (p_user, p_points, p_reason, p_source)
  on conflict (user_id, reason, source_id) do nothing;
end;
$$;

create or replace function private.community_require_member()
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not public.can_access_community() then raise exception 'not a community member' using errcode = '42501'; end if;
  return auth.uid();
end;
$$;

-- ── Member RPCs ─────────────────────────────────────────────
create or replace function public.community_create_post(
  p_channel_id uuid, p_challenge_id uuid, p_title text, p_body text, p_image_path text, p_poll_options jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := private.community_require_member();
  v_staff boolean := public.current_staff_role() is not null;
  v_channel public.community_channels%rowtype;
  v_status text := 'published';
  v_id uuid;
begin
  if p_channel_id is null and p_challenge_id is null then
    raise exception 'choose a channel' using errcode = '22023';
  end if;
  if p_channel_id is not null then
    select * into v_channel from public.community_channels where id = p_channel_id;
    if v_channel.id is null then raise exception 'unknown channel' using errcode = '22023'; end if;
    if v_channel.posting = 'staff' and not v_staff then raise exception 'only the team posts here' using errcode = '42501'; end if;
  end if;
  if p_challenge_id is not null and not exists (select 1 from public.community_challenges where id = p_challenge_id and (published or v_staff)) then
    raise exception 'unknown challenge' using errcode = '22023';
  end if;
  if p_image_path is not null and p_image_path not like v_uid::text || '/%' then
    raise exception 'image must be your own upload' using errcode = '42501';
  end if;
  if p_poll_options is not null and (
       jsonb_typeof(p_poll_options) <> 'array' or jsonb_array_length(p_poll_options) not between 2 and 6
       or exists (select 1 from jsonb_array_elements(p_poll_options) o
                   where jsonb_typeof(o) <> 'string' or char_length(trim(o #>> '{}')) not between 1 and 100)) then
    raise exception 'polls need 2 to 6 short options' using errcode = '22023';
  end if;
  if not v_staff and ((select require_approval from public.community_settings where id = 1) or coalesce(v_channel.requires_approval, false)) then
    v_status := 'pending';
  end if;

  insert into public.community_posts (channel_id, challenge_id, author_id, title, body, image_path, poll_options, status)
  values (p_channel_id, p_challenge_id, v_uid, nullif(trim(p_title), ''), trim(p_body), p_image_path, p_poll_options, v_status)
  returning id into v_id;
  if v_status = 'published' then perform private.community_award(v_uid, 'post', v_id::text, 1, 5); end if;
  return v_id;
end;
$$;

create or replace function public.community_update_post(p_post_id uuid, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
begin
  update public.community_posts
     set title = nullif(trim(p_title), ''), body = trim(p_body), updated_at = now()
   where id = p_post_id and status <> 'removed'
     and (author_id = v_uid or public.current_staff_role() is not null);
  if not found then raise exception 'not your post' using errcode = '42501'; end if;
end;
$$;

create or replace function public.community_delete_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
begin
  update public.community_posts set status = 'removed', pinned = false, updated_at = now()
   where id = p_post_id and (author_id = v_uid or public.current_staff_role() is not null);
  if not found then raise exception 'not your post' using errcode = '42501'; end if;
end;
$$;

create or replace function public.community_add_comment(p_post_id uuid, p_parent_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
  v_post public.community_posts%rowtype;
  v_id uuid;
begin
  select * into v_post from public.community_posts where id = p_post_id and status <> 'removed';
  if v_post.id is null or not (private.community_post_live(v_post.status, v_post.publish_at) or public.current_staff_role() is not null) then
    raise exception 'post not found' using errcode = '22023';
  end if;
  if v_post.comments_locked and public.current_staff_role() is null then raise exception 'comments are closed' using errcode = '42501'; end if;
  if p_parent_id is not null and not exists (
    select 1 from public.community_comments where id = p_parent_id and post_id = p_post_id and parent_id is null and not removed
  ) then
    raise exception 'replies are one level deep' using errcode = '22023';
  end if;
  insert into public.community_comments (post_id, author_id, parent_id, body) values (p_post_id, v_uid, p_parent_id, trim(p_body))
  returning id into v_id;
  perform private.community_award(v_uid, case when v_post.challenge_id is null then 'comment' else 'challenge_comment' end, v_id::text,
                                  case when v_post.challenge_id is null then 1 else 3 end, 5);
  return v_id;
end;
$$;

create or replace function public.community_delete_comment(p_comment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
begin
  update public.community_comments set removed = true
   where id = p_comment_id and not removed and (author_id = v_uid or public.current_staff_role() is not null);
  if not found then raise exception 'not your comment' using errcode = '42501'; end if;
end;
$$;

-- Returns true when the item is now liked by the caller.
create or replace function public.community_toggle_like(p_post_id uuid, p_comment_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
  v_author uuid;
  v_source text := coalesce(p_post_id, p_comment_id)::text;
begin
  if num_nonnulls(p_post_id, p_comment_id) <> 1 then raise exception 'like a post or a comment' using errcode = '22023'; end if;
  delete from public.community_likes
   where user_id = v_uid and post_id is not distinct from p_post_id and comment_id is not distinct from p_comment_id;
  if found then return false; end if;

  if p_post_id is not null then
    select author_id into v_author from public.community_posts where id = p_post_id and status <> 'removed';
  else
    select author_id into v_author from public.community_comments where id = p_comment_id and not removed;
  end if;
  if v_author is null then raise exception 'not found' using errcode = '22023'; end if;
  insert into public.community_likes (user_id, post_id, comment_id) values (v_uid, p_post_id, p_comment_id);
  perform private.community_award(v_uid, 'like_given', v_source, 1, 5);
  if v_author <> v_uid then
    perform private.community_award(v_author, 'like_received', v_source || ':' || v_uid::text, 1, 50);
  end if;
  return true;
end;
$$;

create or replace function public.community_vote(p_post_id uuid, p_option int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
  v_options jsonb;
begin
  select poll_options into v_options from public.community_posts where id = p_post_id and status <> 'removed';
  if v_options is null or p_option is null or p_option < 0 or p_option >= jsonb_array_length(v_options) then
    raise exception 'pick one of the poll options' using errcode = '22023';
  end if;
  insert into public.community_poll_votes (post_id, user_id, option_index) values (p_post_id, v_uid, p_option)
  on conflict (post_id, user_id) do update set option_index = excluded.option_index, created_at = now();
  perform private.community_award(v_uid, 'poll_vote', p_post_id::text, 1, 5);
end;
$$;

create or replace function public.community_poll_counts(p_post_ids uuid[])
returns table (post_id uuid, option_index int, votes bigint)
language sql stable security definer set search_path = public as $$
  select v.post_id, v.option_index, count(*)
    from public.community_poll_votes v
   where public.can_access_community() and v.post_id = any(p_post_ids[1:200])
   group by v.post_id, v.option_index;
$$;

create or replace function public.community_report_post(p_post_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
begin
  insert into public.community_reports (post_id, user_id, reason) values (p_post_id, v_uid, left(trim(coalesce(p_reason, '')), 500))
  on conflict (post_id, user_id) do nothing;
  if found then update public.community_posts set report_count = report_count + 1 where id = p_post_id; end if;
end;
$$;

create or replace function public.community_join_challenge(p_challenge_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
begin
  if not exists (select 1 from public.community_challenges where id = p_challenge_id and published) then
    raise exception 'challenge not found' using errcode = '22023';
  end if;
  insert into public.community_challenge_participants (challenge_id, user_id) values (p_challenge_id, v_uid)
  on conflict do nothing;
end;
$$;

create or replace function public.community_complete_step(p_step_id uuid, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
  v_challenge public.community_challenges%rowtype;
begin
  select c.* into v_challenge from public.community_challenges c
    join public.community_challenge_steps s on s.challenge_id = c.id
   where s.id = p_step_id and c.published;
  if v_challenge.id is null then raise exception 'step not found' using errcode = '22023'; end if;
  insert into public.community_challenge_participants (challenge_id, user_id) values (v_challenge.id, v_uid) on conflict do nothing;

  if p_done then
    insert into public.community_step_completions (step_id, user_id) values (p_step_id, v_uid) on conflict do nothing;
  else
    delete from public.community_step_completions where step_id = p_step_id and user_id = v_uid;
  end if;

  if not exists (
    select 1 from public.community_challenge_steps s
     where s.challenge_id = v_challenge.id
       and not exists (select 1 from public.community_step_completions c where c.step_id = s.id and c.user_id = v_uid)
  ) then
    update public.community_challenge_participants set completed_at = coalesce(completed_at, now())
     where challenge_id = v_challenge.id and user_id = v_uid;
    perform private.community_award(v_uid, 'challenge_completed', v_challenge.id::text, v_challenge.points, null);
  else
    update public.community_challenge_participants set completed_at = null
     where challenge_id = v_challenge.id and user_id = v_uid;
  end if;
end;
$$;

create or replace function public.community_rsvp(p_meetup_id uuid, p_going boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
begin
  if not exists (select 1 from public.community_meetups where id = p_meetup_id and published and not canceled) then
    raise exception 'meetup not found' using errcode = '22023';
  end if;
  if p_going then
    insert into public.community_rsvps (meetup_id, user_id) values (p_meetup_id, v_uid) on conflict do nothing;
    perform private.community_award(v_uid, 'rsvp', p_meetup_id::text, 25, null);
  else
    delete from public.community_rsvps where meetup_id = p_meetup_id and user_id = v_uid;
  end if;
end;
$$;

-- Public member details (name, dog, avatar) for authors, members and leaderboards.
create or replace function public.community_profiles(p_user_ids uuid[])
returns table (user_id uuid, full_name text, dog_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.dog_name, p.avatar_url
    from public.profiles p
   where public.can_access_community() and p.id = any(p_user_ids[1:500]);
$$;

create or replace function public.community_leaderboard(p_since timestamptz, p_limit int)
returns table (user_id uuid, full_name text, dog_name text, avatar_url text, points bigint)
language sql stable security definer set search_path = public as $$
  select pt.user_id, p.full_name, p.dog_name, p.avatar_url, sum(pt.points)
    from public.community_points pt
    left join public.profiles p on p.id = pt.user_id
   where public.can_access_community() and (p_since is null or pt.created_at >= p_since)
   group by pt.user_id, p.full_name, p.dog_name, p.avatar_url
   order by 5 desc, 2
   limit greatest(1, least(coalesce(p_limit, 25), 100));
$$;

-- Everyone who is a member now: active students (when open to students), community grants and staff.
create or replace function public.community_members(p_search text, p_limit int, p_offset int)
returns table (user_id uuid, full_name text, dog_name text, avatar_url text, points bigint, joined_at timestamptz, total_count bigint)
language sql stable security definer set search_path = public as $$
  with members as (
    select e.user_id, min(e.enrolled_at) as joined_at from public.enrollments e
     where (select open_to_students from public.community_settings where id = 1)
       and (e.expires_at is null or e.expires_at > now())
     group by e.user_id
    union all
    select g.user_id, min(g.created_at) from public.community_grants g
     where g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
     group by g.user_id
    union all
    select s.user_id, s.created_at from public.staff_members s
  ), distinct_members as (
    select m.user_id, min(m.joined_at) as joined_at from members m group by m.user_id
  ), filtered as (
    select d.user_id, p.full_name, p.dog_name, p.avatar_url, d.joined_at,
           (select coalesce(sum(pt.points), 0) from public.community_points pt where pt.user_id = d.user_id) as points
      from distinct_members d
      left join public.profiles p on p.id = d.user_id
     where coalesce(p_search, '') = ''
        or p.full_name ilike '%' || p_search || '%'
        or p.dog_name ilike '%' || p_search || '%'
  )
  select f.user_id, f.full_name, f.dog_name, f.avatar_url, f.points, f.joined_at, count(*) over ()
    from filtered f
   where public.can_access_community()
   order by f.points desc, f.joined_at
   limit greatest(1, least(coalesce(p_limit, 48), 200)) offset greatest(0, coalesce(p_offset, 0));
$$;

-- ── Offers that include the community grant / revoke it ──
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

  if (select includes_community from public.offers where id = p_offer_id) then
    if p_order_id is not null then
      insert into public.community_grants (user_id, offer_id, order_id, source, expires_at)
      values (p_user_id, p_offer_id, p_order_id, p_source, p_expires_at)
      on conflict (user_id, order_id) where order_id is not null do update
        set expires_at = case
              when public.community_grants.expires_at is null or excluded.expires_at is null then null
              else greatest(public.community_grants.expires_at, excluded.expires_at)
            end;
    else
      insert into public.community_grants (user_id, offer_id, source, expires_at) values (p_user_id, p_offer_id, p_source, p_expires_at);
    end if;
  end if;
  return v_newly_active;
end;
$$;

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

  update public.community_grants
     set revoked_at = now()
   where user_id = p_user_id and revoked_at is null
     and ((p_order_id is not null and order_id = p_order_id) or (p_order_id is null and offer_id = p_offer_id));

  for v_course in select course_id from public.offer_courses where offer_id = p_offer_id loop
    perform private.recompute_enrollment(p_user_id, v_course);
  end loop;

  perform private.emit_event('access.revoked', p_user_id, 'offer', p_offer_id::text,
                             jsonb_build_object('order_id', p_order_id, 'grants', v_count));
  return v_count;
end;
$$;

-- ── Private media bucket for post images (signed URLs; members upload to their own folder) ──
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('community-media', 'community-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    on conflict (id) do nothing;
  end if;
end $$;

-- ── Grants ──────────────────────────────────────────────────
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.community_create_post(uuid, uuid, text, text, text, jsonb)',
    'public.community_update_post(uuid, text, text)',
    'public.community_delete_post(uuid)',
    'public.community_add_comment(uuid, uuid, text)',
    'public.community_delete_comment(uuid)',
    'public.community_toggle_like(uuid, uuid)',
    'public.community_vote(uuid, int)',
    'public.community_poll_counts(uuid[])',
    'public.community_report_post(uuid, text)',
    'public.community_join_challenge(uuid)',
    'public.community_complete_step(uuid, boolean)',
    'public.community_rsvp(uuid, boolean)',
    'public.community_profiles(uuid[])',
    'public.community_leaderboard(timestamptz, int)',
    'public.community_members(text, int, int)',
    'public.can_access_community()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;
revoke all on function private.community_award(uuid, text, text, int, int) from public, anon, authenticated;
revoke all on function private.community_require_member() from public, anon;
revoke all on function public.grant_offer_access(uuid, uuid, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.revoke_offer_access(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_offer_access(uuid, uuid, text, uuid, timestamptz) to service_role;
grant execute on function public.revoke_offer_access(uuid, uuid, uuid) to service_role;
