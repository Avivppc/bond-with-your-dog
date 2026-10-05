-- Each flow and campaign chooses who it emails: only people who agreed to marketing email
-- ('marketing', the default) or everyone who hasn't unsubscribed ('all', for service messages such
-- as "Roni replied to your video"). Unsubscribes are always respected.

alter table public.email_flows add column if not exists consent text not null default 'marketing'
  check (consent in ('marketing', 'all'));

-- Whether this address may get an email: never after an unsubscribe; marketing email also needs consent.
create or replace function public.can_email(p_user_id uuid, p_email text, p_require_consent boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when p_require_consent then public.can_market(p_user_id, p_email)
    else not public.is_unsubscribed(p_user_id, p_email)
     and not public.is_unsubscribed(
           coalesce(p_user_id, (select u.id from auth.users u where lower(u.email::text) = lower(p_email) limit 1)), null)
  end;
$$;
revoke execute on function public.can_email(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.can_email(uuid, text, boolean) to service_role;

-- Campaign audiences read the choice from the audience: {"consent": "marketing" | "all", ...}.
create or replace function public.campaign_audience(p_audience jsonb)
returns table (user_id uuid, email text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_kind text := coalesce(p_audience->>'kind', 'all_members');
  v_course text := p_audience->>'courseId';
  v_days int := coalesce((p_audience->>'days')::int, 7);
  v_tag text := lower(btrim(coalesce(p_audience->>'tag', '')));
  v_consent boolean := coalesce(p_audience->>'consent', 'marketing') <> 'all';
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
  select p.user_id, p.email from picked p where public.can_email(p.user_id, p.email, v_consent);
end;
$$;

-- Right before each campaign batch: still allowed under the campaign's choice?
create or replace function public.marketable_messages(p_message_ids uuid[])
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.id
    from public.email_messages m
    join public.email_campaigns c on c.id = m.campaign_id
   where m.id = any(p_message_ids)
     and public.can_email(m.user_id, m.to_email, coalesce(c.audience->>'consent', 'marketing') <> 'all');
$$;
