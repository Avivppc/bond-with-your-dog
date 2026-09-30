-- Review fixes for the community (2026-10): tighter read rules, meeting links only near the start,
-- challenge/meetup time windows, and points for posts a moderator approves.

-- ── Draft challenges: their steps are hidden like the challenge itself ──
drop policy if exists community_steps_read on public.community_challenge_steps;
create policy community_steps_read on public.community_challenge_steps for select to authenticated
  using (public.can_access_community()
         and exists (select 1 from public.community_challenges c
                      where c.id = challenge_id and (c.published or public.current_staff_role() is not null)));

-- ── Comments are only readable on posts the member can see (posts RLS applies inside the subquery) ──
drop policy if exists community_comments_read on public.community_comments;
create policy community_comments_read on public.community_comments for select to authenticated
  using (public.can_access_community() and not removed
         and exists (select 1 from public.community_posts p where p.id = post_id));

-- ── Meeting links: never readable directly; community_meetup_link hands them out near the start ──
alter table public.community_meetups
  add column if not exists has_meeting_link boolean generated always as (meeting_url is not null) stored;
revoke select on public.community_meetups from anon, authenticated;
grant select (id, title, description, starts_at, duration_minutes, location, cover_image_url, published, canceled, created_at, has_meeting_link)
  on public.community_meetups to authenticated;

create or replace function public.community_meetup_link(p_meetup_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_meetup public.community_meetups%rowtype;
begin
  if not public.can_access_community() then return null; end if;
  select * into v_meetup from public.community_meetups
   where id = p_meetup_id and published and not canceled;
  if v_meetup.id is null then return null; end if;
  -- Open from 15 minutes before the start until the end.
  if now() < v_meetup.starts_at - interval '15 minutes'
     or now() > v_meetup.starts_at + make_interval(mins => v_meetup.duration_minutes) then
    return null;
  end if;
  return v_meetup.meeting_url;
end;
$$;
revoke all on function public.community_meetup_link(uuid) from public, anon;
grant execute on function public.community_meetup_link(uuid) to authenticated;

-- ── Challenges: join until the end; steps count only while the challenge runs ──
create or replace function public.community_join_challenge(p_challenge_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
begin
  if not exists (select 1 from public.community_challenges where id = p_challenge_id and published) then
    raise exception 'challenge not found' using errcode = '22023';
  end if;
  if exists (select 1 from public.community_challenges where id = p_challenge_id and ends_at < now()) then
    raise exception 'this challenge has ended' using errcode = '22023';
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
  if now() < v_challenge.starts_at then raise exception 'this challenge has not started yet' using errcode = '22023'; end if;
  if now() > v_challenge.ends_at then raise exception 'this challenge has ended' using errcode = '22023'; end if;
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

-- ── RSVP: only for meetups that haven't ended ──
create or replace function public.community_rsvp(p_meetup_id uuid, p_going boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.community_require_member();
begin
  if not exists (
    select 1 from public.community_meetups
     where id = p_meetup_id and published and not canceled
       and starts_at + make_interval(mins => duration_minutes) > now()
  ) then
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

-- ── A post a moderator approves earns its author the same point as a post published directly ──
create or replace function private.community_post_approved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status = 'published' then
    perform private.community_award(new.author_id, 'post', new.id::text, 1, 5);
  end if;
  return new;
end;
$$;
drop trigger if exists community_post_approved on public.community_posts;
create trigger community_post_approved after update of status on public.community_posts
  for each row execute function private.community_post_approved();
