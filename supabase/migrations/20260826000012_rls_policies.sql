-- Row Level Security: tenant isolation + role-based access, enforced as the final
-- backstop independent of application-layer RBAC (lib/auth/rbac.ts) and the UI.
--
-- Role buckets, matching the M0 RBAC matrix:
--   MONEY_READ   = OWNER, ADMIN, ACCOUNTANT, READ_ONLY   (invoices/expenses/payments/reports)
--   MONEY_WRITE  = OWNER, ADMIN, ACCOUNTANT
--   BIZ_WRITE    = OWNER, ADMIN, EMPLOYEE                (clients/suppliers/projects/catalog/documents)
--   ADMIN_ONLY   = OWNER, ADMIN                           (org settings/users/billing, deletes)

-- ============ ORGANIZATIONS ============

alter table organizations enable row level security;

-- The "no members yet" clause is a narrow bootstrap window: `INSERT ... RETURNING`
-- (used by create_organization(), see the onboarding_function migration) needs the
-- SELECT policy to pass for the row it just inserted, but the owner's
-- organization_users row is only added in the *next* statement of that same
-- transaction — without this clause a brand-new org would be unreadable by its own
-- creator until that follow-up insert commits. Once any member exists, only actual
-- members can see the org, same as organization_users_insert's bootstrap check.
-- Must go through organization_has_no_members() (SECURITY DEFINER) rather than an
-- inline `not exists (select ... from organization_users ...)` — the inline form
-- is itself subject to organization_users' own RLS, so a non-member of ANY other
-- org would see zero rows there and wrongly read that as "this org has no members."
create policy organizations_select on organizations for select
  using (
    is_org_member(id)
    or organization_has_no_members(id)
  );

create policy organizations_insert on organizations for insert
  with check (auth.uid() is not null);

create policy organizations_update on organizations for update
  using (has_org_role(id, array['OWNER','ADMIN']))
  with check (has_org_role(id, array['OWNER','ADMIN']));

-- No delete policy: organization deletion is a GDPR/offboarding workflow (section 27
-- of the architecture doc), not a self-service action in the MVP.

-- ============ ORGANIZATION_BANK_ACCOUNTS ============

alter table organization_bank_accounts enable row level security;

create policy bank_accounts_select on organization_bank_accounts for select
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

create policy bank_accounts_insert on organization_bank_accounts for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));

create policy bank_accounts_update on organization_bank_accounts for update
  using (has_org_role(organization_id, array['OWNER','ADMIN']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));

create policy bank_accounts_delete on organization_bank_accounts for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

-- ============ PROFILES ============

alter table profiles enable row level security;

create policy profiles_select on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from organization_users ou1
      join organization_users ou2 on ou2.organization_id = ou1.organization_id
      where ou1.user_id = auth.uid() and ou1.status = 'ACTIVE'
        and ou2.user_id = profiles.id and ou2.status = 'ACTIVE'
    )
  );

create policy profiles_update_self on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============ ORGANIZATION_USERS ============

alter table organization_users enable row level security;

create policy organization_users_select on organization_users for select
  using (is_org_member(organization_id));

-- Bootstrap: a user may add themselves as OWNER only when the org has no members yet
-- (i.e. they are the one who just created it). Any other membership change requires
-- an existing OWNER/ADMIN.
create policy organization_users_insert on organization_users for insert
  with check (
    (
      user_id = auth.uid()
      and role = 'OWNER'
      and not exists (
        select 1 from organization_users existing
        where existing.organization_id = organization_users.organization_id
      )
    )
    or has_org_role(organization_id, array['OWNER','ADMIN'])
  );

create policy organization_users_update on organization_users for update
  using (has_org_role(organization_id, array['OWNER','ADMIN']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));

create policy organization_users_delete on organization_users for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

-- Invite acceptance goes through this function rather than a direct UPDATE grant,
-- so a regular member can never self-elevate their own role via the API.
create or replace function accept_organization_invite(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update organization_users
  set status = 'ACTIVE', joined_at = now()
  where organization_id = p_organization_id
    and user_id = auth.uid()
    and status = 'INVITED';
end;
$$;

-- ============ CLIENTS / SUPPLIERS / PROJECTS (BIZ_WRITE) ============

alter table clients enable row level security;

create policy clients_select on clients for select
  using (is_org_member(organization_id));
create policy clients_insert on clients for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']));
create policy clients_update on clients for update
  using (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']));
create policy clients_delete on clients for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

alter table suppliers enable row level security;

create policy suppliers_select on suppliers for select
  using (is_org_member(organization_id));
create policy suppliers_insert on suppliers for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']));
create policy suppliers_update on suppliers for update
  using (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']));
create policy suppliers_delete on suppliers for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

alter table projects enable row level security;

create policy projects_select on projects for select
  using (is_org_member(organization_id));
create policy projects_insert on projects for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']));
create policy projects_update on projects for update
  using (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']));
create policy projects_delete on projects for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

-- ============ PRODUCTS_SERVICES / DOCUMENTS (BIZ_WRITE) ============

alter table products_services enable row level security;

create policy products_services_select on products_services for select
  using (is_org_member(organization_id));
create policy products_services_insert on products_services for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']));
create policy products_services_update on products_services for update
  using (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']));
create policy products_services_delete on products_services for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

alter table documents enable row level security;

create policy documents_select on documents for select
  using (is_org_member(organization_id));
create policy documents_insert on documents for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']));
create policy documents_update on documents for update
  using (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN','EMPLOYEE']));
create policy documents_delete on documents for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

-- ============ INVOICE_SERIES / INVOICES / EXPENSES / PAYMENTS (MONEY) ============

alter table invoice_series enable row level security;

create policy invoice_series_select on invoice_series for select
  using (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT','READ_ONLY']));
create policy invoice_series_insert on invoice_series for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']));
create policy invoice_series_update on invoice_series for update
  using (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']));
create policy invoice_series_delete on invoice_series for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

alter table invoices enable row level security;

create policy invoices_select on invoices for select
  using (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT','READ_ONLY']));
create policy invoices_insert on invoices for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']));
create policy invoices_update on invoices for update
  using (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']));
create policy invoices_delete on invoices for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

alter table invoice_lines enable row level security;

create policy invoice_lines_select on invoice_lines for select
  using (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and has_org_role(i.organization_id, array['OWNER','ADMIN','ACCOUNTANT','READ_ONLY'])
  ));
create policy invoice_lines_insert on invoice_lines for insert
  with check (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and has_org_role(i.organization_id, array['OWNER','ADMIN','ACCOUNTANT'])
  ));
create policy invoice_lines_update on invoice_lines for update
  using (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and has_org_role(i.organization_id, array['OWNER','ADMIN','ACCOUNTANT'])
  ))
  with check (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and has_org_role(i.organization_id, array['OWNER','ADMIN','ACCOUNTANT'])
  ));
create policy invoice_lines_delete on invoice_lines for delete
  using (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and has_org_role(i.organization_id, array['OWNER','ADMIN'])
  ));

alter table expenses enable row level security;

create policy expenses_select on expenses for select
  using (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT','READ_ONLY']));
create policy expenses_insert on expenses for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']));
create policy expenses_update on expenses for update
  using (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']));
create policy expenses_delete on expenses for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

alter table payments enable row level security;

create policy payments_select on payments for select
  using (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT','READ_ONLY']));
create policy payments_insert on payments for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']));
create policy payments_update on payments for update
  using (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']));
create policy payments_delete on payments for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

-- ============ TAX_INTEGRATIONS / E-FACTURA (ADMIN connects, ACCOUNTANT operates) ============

alter table tax_integrations enable row level security;

create policy tax_integrations_select on tax_integrations for select
  using (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy tax_integrations_insert on tax_integrations for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy tax_integrations_update on tax_integrations for update
  using (has_org_role(organization_id, array['OWNER','ADMIN']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy tax_integrations_delete on tax_integrations for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

alter table einvoice_submissions enable row level security;

create policy einvoice_submissions_select on einvoice_submissions for select
  using (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT','READ_ONLY']));
create policy einvoice_submissions_insert on einvoice_submissions for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']));
create policy einvoice_submissions_update on einvoice_submissions for update
  using (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT']));
-- No delete policy: submissions are corrected via new submissions, never removed.

-- Append-only audit trail: SELECT + INSERT only, no UPDATE/DELETE policy at all.
alter table einvoice_submission_events enable row level security;

create policy einvoice_submission_events_select on einvoice_submission_events for select
  using (exists (
    select 1 from einvoice_submissions s
    where s.id = einvoice_submission_events.submission_id
      and has_org_role(s.organization_id, array['OWNER','ADMIN','ACCOUNTANT','READ_ONLY'])
  ));
create policy einvoice_submission_events_insert on einvoice_submission_events for insert
  with check (exists (
    select 1 from einvoice_submissions s
    where s.id = einvoice_submission_events.submission_id
      and has_org_role(s.organization_id, array['OWNER','ADMIN','ACCOUNTANT'])
  ));

-- ============ EMPLOYEES (ADMIN_ONLY: staff records) ============

alter table employees enable row level security;

create policy employees_select on employees for select
  using (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy employees_insert on employees for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy employees_update on employees for update
  using (has_org_role(organization_id, array['OWNER','ADMIN']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy employees_delete on employees for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

-- ============ NOTIFICATIONS (per-user within the org) ============

alter table notifications enable row level security;

create policy notifications_select on notifications for select
  using (
    is_org_member(organization_id)
    and (user_id = auth.uid() or user_id is null)
  );
create policy notifications_update on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- No client insert/delete policy: the notification engine writes via service-role.

-- ============ AUDIT_LOGS (append-only) ============

alter table audit_logs enable row level security;

create policy audit_logs_select on audit_logs for select
  using (is_org_member(organization_id));
create policy audit_logs_insert on audit_logs for insert
  with check (is_org_member(organization_id) and (user_id is null or user_id = auth.uid()));
-- No UPDATE/DELETE policy: audit history is immutable from the API.

-- ============ BILLING: PLANS / SUBSCRIPTIONS / USAGE / FEATURE_FLAGS ============

alter table plans enable row level security;

create policy plans_select on plans for select
  using (auth.uid() is not null);
-- No write policy: plan catalog is managed by service-role only.

alter table subscriptions enable row level security;

create policy subscriptions_select on subscriptions for select
  using (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy subscriptions_insert on subscriptions for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy subscriptions_update on subscriptions for update
  using (has_org_role(organization_id, array['OWNER','ADMIN']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));

alter table usage_tracking enable row level security;

create policy usage_tracking_select on usage_tracking for select
  using (has_org_role(organization_id, array['OWNER','ADMIN']));
-- No write policy: usage is metered by service-role jobs.

alter table feature_flags enable row level security;

create policy feature_flags_select on feature_flags for select
  using (is_org_member(organization_id));
create policy feature_flags_insert on feature_flags for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy feature_flags_update on feature_flags for update
  using (has_org_role(organization_id, array['OWNER','ADMIN']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy feature_flags_delete on feature_flags for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

-- ============ WEBHOOKS (ADMIN_ONLY) ============

alter table webhook_endpoints enable row level security;

create policy webhook_endpoints_select on webhook_endpoints for select
  using (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy webhook_endpoints_insert on webhook_endpoints for insert
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy webhook_endpoints_update on webhook_endpoints for update
  using (has_org_role(organization_id, array['OWNER','ADMIN']))
  with check (has_org_role(organization_id, array['OWNER','ADMIN']));
create policy webhook_endpoints_delete on webhook_endpoints for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));

alter table webhook_deliveries enable row level security;

create policy webhook_deliveries_select on webhook_deliveries for select
  using (exists (
    select 1 from webhook_endpoints e
    where e.id = webhook_deliveries.webhook_endpoint_id
      and has_org_role(e.organization_id, array['OWNER','ADMIN'])
  ));
-- No client insert/update/delete policy: deliveries are written by the dispatch worker
-- via service-role.

-- ============ ORGANIZATION_BANK_ACCOUNTS index used by policies above ============
-- (index already created in the platform_tables migration; RLS added here to keep
-- every policy declaration in one place.)
