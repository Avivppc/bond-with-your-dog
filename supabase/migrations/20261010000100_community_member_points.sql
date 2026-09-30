-- A member's total community points (profile pages), visible to community members.
create or replace function public.community_member_points(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select case when public.can_access_community()
              then (select coalesce(sum(points), 0) from public.community_points where user_id = p_user_id)
         end;
$$;

revoke all on function public.community_member_points(uuid) from public, anon;
grant execute on function public.community_member_points(uuid) to authenticated, service_role;
