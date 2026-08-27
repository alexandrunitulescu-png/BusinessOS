-- Shared trigger + RLS helper functions.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function set_updated_at();

-- Tenant-membership check used by every RLS policy. SECURITY DEFINER + STABLE
-- so it runs as one indexed lookup against organization_users(user_id, organization_id)
-- regardless of the caller's row-level permissions on that table.
create or replace function is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_users
    where organization_id = target_org
      and user_id = auth.uid()
      and status = 'ACTIVE'
  );
$$;

create or replace function has_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_users
    where organization_id = target_org
      and user_id = auth.uid()
      and status = 'ACTIVE'
      and role = any(allowed_roles)
  );
$$;

-- SECURITY DEFINER so it sees ALL rows regardless of the caller — an inline
-- `not exists (select 1 from organization_users where ...)` written directly in a
-- policy would itself be filtered by organization_users' own RLS, so a non-member
-- would see zero rows for ANY other org's membership and wrongly read that as
-- "this org has no members yet." Used only for the organizations bootstrap-select
-- policy (20260826000012_rls_policies.sql).
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

-- Creates a profile row whenever a new Supabase Auth user is created.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
