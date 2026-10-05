-- Insights counts imported email-only contacts (Contacts → Import) with the leads, so the totals,
-- subscribers and engagement include everyone campaigns can reach.

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
    -- People without an account: quiz takers and imported email-only contacts.
    select x.email, min(x.created_at) as created_at
    from (select lower(l.email) as email, l.created_at from public.quiz_leads l
          union all
          select lower(c.email), c.created_at from public.contacts c) x
    where not exists (select 1 from auth.users u where lower(u.email::text) = x.email)
    group by x.email
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
