-- Fixes a real cross-tenant data leak found while testing M1: the previous
-- organizations_select policy (20260826000016) used an inline
-- `not exists (select ... from organization_users ...)`, which is itself
-- filtered by organization_users' own RLS. A user with no membership in ANY
-- other organization saw zero rows there for a different org and the inline
-- check wrongly read that as "this org has no members yet" — letting them
-- SELECT an organizations row that isn't theirs. organization_has_no_members()
-- (SECURITY DEFINER, added in 20260826000003) sees every row regardless of the
-- caller, closing the gap.
create or replace function organization_has_no_members(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from organization_users where organization_id = target_org
  );
$$;

grant execute on function organization_has_no_members(uuid) to authenticated, service_role;

drop policy if exists organizations_select on organizations;

create policy organizations_select on organizations for select
  using (
    is_org_member(id)
    or organization_has_no_members(id)
  );
