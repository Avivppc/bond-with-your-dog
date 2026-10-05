-- Review fixes: quiz leads only through the server (Turnstile + consent can't be skipped), flows give
-- and take back chapters through access grants like every other kind of access, consent follows a
-- lead who becomes a member, and campaigns re-check consent batch by batch.

-- ── Quiz leads: written by the server only ────────────────────────────────────
drop policy if exists quiz_leads_insert_anyone on public.quiz_leads;
revoke insert on public.quiz_leads from anon, authenticated;
create index if not exists quiz_leads_email_latest on public.quiz_leads (lower(email), created_at desc);

-- ── Chapters a flow gives: a grant like any other, so recomputes keep it ──────
alter table public.access_grants add column if not exists flow_id uuid references public.email_flows(id) on delete set null;

-- Gives the member full lifetime access to a chapter from a flow. 'already' when they have it.
create or replace function public.grant_flow_access(p_user_id uuid, p_course_id text, p_flow_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.enrollments
     where user_id = p_user_id and course_id = p_course_id and access_level = 'full'
       and (expires_at is null or expires_at > now())
  ) then
    return 'already';
  end if;
  insert into public.access_grants (user_id, course_id, source, expires_at, access_level, flow_id)
  values (p_user_id, p_course_id, 'flow', null, 'full', p_flow_id);
  perform private.recompute_enrollment(p_user_id, p_course_id);
  perform private.emit_event('access.granted', p_user_id, 'course', p_course_id,
                             jsonb_build_object('source', 'flow', 'flow_id', p_flow_id, 'access_level', 'full'));
  return 'granted';
end;
$$;

-- Takes back only what this flow gave; purchases and other grants stay. 'none' when there was nothing.
create or replace function public.revoke_flow_access(p_user_id uuid, p_course_id text, p_flow_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.access_grants
     set revoked_at = now()
   where user_id = p_user_id and course_id = p_course_id and flow_id = p_flow_id and revoked_at is null;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    return 'none';
  end if;
  perform private.recompute_enrollment(p_user_id, p_course_id);
  perform private.emit_event('access.revoked', p_user_id, 'course', p_course_id,
                             jsonb_build_object('source', 'flow', 'flow_id', p_flow_id));
  return 'revoked';
end;
$$;
revoke all on function public.grant_flow_access(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.revoke_flow_access(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.grant_flow_access(uuid, text, uuid) to service_role;
grant execute on function public.revoke_flow_access(uuid, text, uuid) to service_role;

-- ── Consent follows the person: a lead who signs up is asked through their profile ──
create or replace function public.can_market(p_user_id uuid, p_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  with who as (
    select coalesce(p_user_id,
                    (select u.id from auth.users u where lower(u.email::text) = lower(p_email) limit 1)) as uid
  )
  select not public.is_unsubscribed(p_user_id, p_email)
     and not public.is_unsubscribed((select uid from who), null)
     and case
       when (select uid from who) is not null then
         coalesce((select p.marketing_opt_in from public.profiles p where p.id = (select uid from who)), false)
       else
         coalesce((select l.marketing_opt_in from public.quiz_leads l
                    where lower(l.email) = lower(p_email) order by l.created_at desc limit 1), false)
     end;
$$;

-- ── Campaigns: consent is checked again right before each batch goes out ──────
create or replace function public.marketable_messages(p_message_ids uuid[])
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.email_messages m
   where m.id = any(p_message_ids) and public.can_market(m.user_id, m.to_email);
$$;
revoke all on function public.marketable_messages(uuid[]) from public, anon, authenticated;
grant execute on function public.marketable_messages(uuid[]) to service_role;
