-- ============================================================
-- Kajabi-style admin: Contacts, Dashboard cards and the support Inbox
--   admin_people_extras:       email-marketing consent + lifetime value (net of refunds) per contact
--   admin_dashboard_counts:    active students, videos waiting for Roni, open inbox items, community members
--   admin_list_support_requests / admin_support_counts: the Inbox (questions, problems, stories)
-- All service role only — the app checks requireStaff() before calling them.
-- Tests: supabase/tests/admin_contacts.test.sql
-- ============================================================

-- Lifetime value = charges minus refunds from the payments ledger, one entry per currency.
create or replace function public.admin_people_extras(p_user_ids uuid[])
returns table (user_id uuid, marketing_opt_in boolean, lifetime_value jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id,
         coalesce(p.marketing_opt_in, false),
         coalesce((
           select jsonb_agg(jsonb_build_object('currency', v.currency, 'net_cents', v.net_cents) order by v.net_cents desc)
             from (
               select pay.currency,
                      coalesce(sum(pay.amount_cents) filter (where pay.kind = 'charge'), 0)
                        - coalesce(sum(pay.amount_cents) filter (where pay.kind = 'refund'), 0) as net_cents
                 from public.payments pay
                where pay.user_id = u.id
                group by pay.currency
             ) v
         ), '[]'::jsonb)
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = any(p_user_ids[1:500]);
$$;

create or replace function public.admin_dashboard_counts()
returns table (active_students bigint, videos_waiting bigint, open_inbox bigint, community_members bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with active as (
    select distinct e.user_id
      from public.enrollments e
     where e.expires_at is null or e.expires_at > now()
  )
  select (select count(*) from active),
         (select count(*) from public.feedback_videos where status = 'waiting'),
         (select count(*) from public.support_requests where status = 'open'),
         (select count(*) from (
            select g.user_id from public.community_grants g
             where g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
            union
            select a.user_id from active a
             where coalesce((select s.open_to_students from public.community_settings s where s.id = 1), false)
            union
            select m.user_id from public.staff_members m
          ) members);
$$;

-- p_kind: question | bug | story (null = all); p_status: open | answered | closed (null = all)
create or replace function public.admin_list_support_requests(p_kind text, p_status text, p_limit int, p_offset int)
returns table (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  kind text,
  subject text,
  body text,
  page_url text,
  consent_public boolean,
  status text,
  answer text,
  answered_at timestamptz,
  answered_by_email text,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.user_id, u.email::text, p.full_name, r.kind, r.subject, r.body, r.page_url, r.consent_public,
         r.status, r.answer, r.answered_at, a.email::text, r.created_at,
         count(*) over ()
    from public.support_requests r
    left join auth.users u on u.id = r.user_id
    left join public.profiles p on p.id = r.user_id
    left join auth.users a on a.id = r.answered_by
   where (p_kind is null or r.kind = p_kind)
     and (p_status is null or r.status = p_status)
   order by r.created_at desc
   limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.admin_support_counts()
returns table (kind text, status text, requests bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.kind, r.status, count(*) from public.support_requests r group by r.kind, r.status;
$$;

revoke all on function public.admin_people_extras(uuid[]) from public, anon, authenticated;
revoke all on function public.admin_dashboard_counts() from public, anon, authenticated;
revoke all on function public.admin_list_support_requests(text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_support_counts() from public, anon, authenticated;
grant execute on function public.admin_people_extras(uuid[]) to service_role;
grant execute on function public.admin_dashboard_counts() to service_role;
grant execute on function public.admin_list_support_requests(text, text, int, int) to service_role;
grant execute on function public.admin_support_counts() to service_role;
