-- Corrects organizations_select (see 20260826000012_rls_policies.sql, edited
-- in place there too so a fresh `db reset` matches this). Without the bootstrap
-- clause, create_organization()'s `INSERT ... RETURNING id INTO` on a brand-new
-- org fails RLS: the SELECT policy required membership, but the owner's
-- organization_users row is only inserted in the *next* statement.
--
-- Superseded same-day by 20260826000017: the first version of this fix used an
-- inline `not exists (select ... from organization_users ...)`, which is itself
-- subject to organization_users' own RLS — a non-member of ANY other org sees
-- zero rows there and wrongly reads that as "this org has no members," which let
-- User B read User A's organization row. Kept here (in its corrected form) only
-- so a fresh `db reset` doesn't replay the vulnerable version.
drop policy if exists organizations_select on organizations;

create policy organizations_select on organizations for select
  using (
    is_org_member(id)
    or organization_has_no_members(id)
  );
