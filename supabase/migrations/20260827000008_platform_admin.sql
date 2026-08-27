-- M11 — platform admin + complimentary "INTERNAL" plan.
--
-- Two new concepts:
--   1. INTERNAL plan: free, no limits, every feature on. Not shown in the public
--      plan comparison; only a platform admin can assign it (the self-serve
--      changePlanAction validates against the 4 public codes only).
--   2. profiles.is_platform_admin: platform staff. Grants a NARROW cross-tenant
--      RLS exception — enough to list orgs and manage their plan, nothing more.
--      Business-data tables (clients/invoices/expenses/documents/storage) are
--      deliberately NOT touched: a platform admin still cannot read tenant data,
--      so the M10 isolation guarantees hold for everything that matters.

-- ---- 1. INTERNAL plan --------------------------------------------------------
alter table plans drop constraint if exists plans_code_check;
alter table plans add constraint plans_code_check
  check (code in ('FREE','STARTER','PRO','BUSINESS','INTERNAL'));

insert into plans (code, name, price, currency, limits, features) values
  ('INTERNAL', 'Intern', 0, 'RON', '{}',
    '{"CRM": true, "PROJECTS": true, "EXPENSES": true, "DOCUMENTS": true, "EMPLOYEES": true, "EFACTURA": true, "AUTOMATIONS": true}')
on conflict (code) do nothing;

-- ---- 2. platform-admin flag + helper ---------------------------------------
alter table profiles add column if not exists is_platform_admin boolean not null default false;

-- SECURITY DEFINER: the inner read of profiles bypasses RLS, so this is safe to
-- call from inside profiles' own policy without recursion (same pattern as
-- is_org_member / has_org_role in 20260826000003).
create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_platform_admin from profiles where id = auth.uid()), false);
$$;

grant execute on function is_platform_admin() to authenticated;

-- ---- 3. narrow RLS exception ---------------------------------------------
-- Only the tables the /admin screen reads: organizations, their owner
-- membership + profile, and subscriptions (which it also updates).

drop policy organizations_select on organizations;
create policy organizations_select on organizations for select
  using (
    is_org_member(id)
    or organization_has_no_members(id)
    or is_platform_admin()
  );

drop policy organization_users_select on organization_users;
create policy organization_users_select on organization_users for select
  using (is_org_member(organization_id) or is_platform_admin());

drop policy profiles_select on profiles;
create policy profiles_select on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from organization_users ou1
      join organization_users ou2 on ou2.organization_id = ou1.organization_id
      where ou1.user_id = auth.uid() and ou1.status = 'ACTIVE'
        and ou2.user_id = profiles.id and ou2.status = 'ACTIVE'
    )
    or is_platform_admin()
  );

drop policy subscriptions_select on subscriptions;
create policy subscriptions_select on subscriptions for select
  using (has_org_role(organization_id, array['OWNER','ADMIN']) or is_platform_admin());

drop policy subscriptions_update on subscriptions;
create policy subscriptions_update on subscriptions for update
  using (has_org_role(organization_id, array['OWNER','ADMIN']) or is_platform_admin())
  with check (has_org_role(organization_id, array['OWNER','ADMIN']) or is_platform_admin());
