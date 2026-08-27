-- Recent Supabase projects no longer auto-expose new `public` schema tables to the
-- Data API roles (anon/authenticated/service_role) — see `auto_expose_new_tables` in
-- supabase/config.toml. Table-level GRANTs are now required in addition to RLS:
-- GRANT decides whether a role may attempt a query at all, RLS decides which rows it
-- sees. Neither replaces the other. `anon` gets nothing here — this app has no
-- unauthenticated data access anywhere.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  organizations,
  organization_bank_accounts,
  profiles,
  organization_users,
  clients,
  suppliers,
  products_services,
  projects,
  invoice_series,
  invoices,
  invoice_lines,
  tax_integrations,
  einvoice_submissions,
  einvoice_submission_events,
  expenses,
  payments,
  documents,
  employees,
  notifications,
  audit_logs,
  plans,
  subscriptions,
  usage_tracking,
  feature_flags,
  webhook_endpoints,
  webhook_deliveries
to authenticated, service_role;

-- Any table added by a future migration is exposed the same way without needing to
-- remember this file.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

grant execute on function is_org_member(uuid) to authenticated, service_role;
grant execute on function has_org_role(uuid, text[]) to authenticated, service_role;
grant execute on function accept_organization_invite(uuid) to authenticated;
