-- Marketing consent everywhere marketing email goes, the sender settings marketing email needs
-- (name, reply-to, the business postal address in every footer), and the Contacts → Insights numbers.

-- ── Consent ───────────────────────────────────────────────────────────────────
-- Quiz leads now tick a box to get emails beyond their result; older leads never did.
alter table public.quiz_leads add column if not exists marketing_opt_in boolean not null default false;

-- Marketing email (flows and campaigns) needs consent and no unsubscribe. Members consent in their
-- profile (sign-up box or settings); leads on the quiz form (their latest answer counts).
create or replace function public.can_market(p_user_id uuid, p_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not public.is_unsubscribed(p_user_id, p_email) and case
    when p_user_id is not null then
      coalesce((select p.marketing_opt_in from public.profiles p where p.id = p_user_id), false)
    else
      coalesce((select l.marketing_opt_in from public.quiz_leads l
                 where lower(l.email) = lower(p_email) order by l.created_at desc limit 1), false)
  end;
$$;
revoke execute on function public.can_market(uuid, text) from public, anon, authenticated;
grant execute on function public.can_market(uuid, text) to service_role;

-- Campaign audiences: same as before, minus anyone who hasn't consented.
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
  select p.user_id, p.email from picked p where public.can_market(p.user_id, p.email);
end;
$$;

-- ── Sender settings for marketing email ────────────────────────────────────────
create table if not exists public.email_settings (
  id int primary key default 1 check (id = 1),
  -- Shown as the sender ("Roni from Bonded"); the address itself stays EMAIL_FROM's verified one.
  sender_name text not null default 'Bonded' check (char_length(btrim(sender_name)) between 1 and 80),
  -- Where replies go (optional).
  reply_to text check (reply_to is null or reply_to ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- The business postal address the law asks for in every marketing email's footer.
  postal_address text check (postal_address is null or char_length(postal_address) <= 300),
  updated_at timestamptz not null default now()
);
alter table public.email_settings enable row level security;
insert into public.email_settings (id) values (1) on conflict (id) do nothing;

-- ── Contacts → Insights ────────────────────────────────────────────────────────
-- One call, all the numbers: contacts (members + quiz leads without an account), customers,
-- marketing consent, unsubscribes, and how recently subscribers engaged.
create or replace function public.admin_contact_insights()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_now timestamptz := now();
  v_30 timestamptz := now() - interval '30 days';
  v_60 timestamptz := now() - interval '60 days';
  v_result jsonb;
begin
  with members as (
    select u.id as user_id, lower(u.email::text) as email, u.created_at,
           greatest(u.last_sign_in_at,
                    (select max(lp.updated_at) from public.lesson_progress lp where lp.user_id = u.id),
                    (select max(s.practiced_on)::timestamptz from public.practice_sessions s where s.user_id = u.id)) as last_active
    from auth.users u where u.email is not null
  ), leads as (
    select lower(l.email) as email, min(l.created_at) as created_at
    from public.quiz_leads l
    where not exists (select 1 from auth.users u where lower(u.email::text) = lower(l.email))
    group by lower(l.email)
  ), contacts as (
    select m.user_id, m.email, m.created_at, m.last_active from members m
    union all
    select null::uuid, l.email, l.created_at, null::timestamptz from leads l
  ), engaged as (
    select c.*,
           public.can_market(c.user_id, c.email) as subscribed,
           greatest(c.last_active,
                    (select max(greatest(em.opened_at, em.clicked_at)) from public.email_messages em where lower(em.to_email) = c.email)) as last_engaged
    from contacts c
  ), customers as (
    select e.user_id, min(e.enrolled_at) as since
    from public.enrollments e
    where e.access_level = 'full' and (e.expires_at is null or e.expires_at > v_now)
    group by e.user_id
  )
  select jsonb_build_object(
    'contacts', jsonb_build_object(
      'total', (select count(*) from contacts),
      'members', (select count(*) from members),
      'leads', (select count(*) from leads),
      'new30', (select count(*) from contacts where created_at >= v_30),
      'newPrev30', (select count(*) from contacts where created_at >= v_60 and created_at < v_30)),
    'customers', jsonb_build_object(
      'total', (select count(*) from customers),
      'new30', (select count(*) from customers where since >= v_30),
      'newPrev30', (select count(*) from customers where since >= v_60 and since < v_30),
      'active30', (select count(*) from customers c join members m on m.user_id = c.user_id where m.last_active >= v_30)),
    'subscribers', jsonb_build_object(
      'total', (select count(*) from engaged where subscribed),
      'notConsented', (select count(*) from engaged where not subscribed
                         and not public.is_unsubscribed(user_id, email)),
      'new30', (select count(*) from engaged where subscribed and created_at >= v_30)),
    'unsubscribed', jsonb_build_object(
      'total', (select count(*) from public.email_unsubscribes),
      'link30', (select count(*) from public.email_unsubscribes where unsubscribed_at >= v_30 and source in ('link', 'one_click')),
      'complaint30', (select count(*) from public.email_unsubscribes where unsubscribed_at >= v_30 and source = 'complaint'),
      'bounce30', (select count(*) from public.email_unsubscribes where unsubscribed_at >= v_30 and source = 'bounce')),
    'engagement', jsonb_build_object(
      'healthy', (select count(*) from engaged where subscribed and last_engaged >= v_now - interval '90 days'),
      'atRisk', (select count(*) from engaged where subscribed and last_engaged < v_now - interval '90 days' and last_engaged >= v_now - interval '180 days'),
      'inactive', (select count(*) from engaged where subscribed and (last_engaged is null or last_engaged < v_now - interval '180 days')))
  ) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.admin_contact_insights() from public, anon, authenticated;
grant execute on function public.admin_contact_insights() to service_role;
