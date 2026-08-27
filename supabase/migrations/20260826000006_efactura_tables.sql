-- RO e-Factura: per-organization tax connections and submission audit trail.

create table tax_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null,
  status text not null default 'NOT_CONNECTED' check (status in ('NOT_CONNECTED','PENDING','CONNECTED','EXPIRED','REVOKED')),
  connected_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create index tax_integrations_org_idx on tax_integrations(organization_id);
create trigger tax_integrations_set_updated_at before update on tax_integrations
  for each row execute function set_updated_at();

create table einvoice_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  provider text not null,
  upload_id text,
  status text not null check (status in ('NOT_REQUIRED','NOT_SENT','QUEUED','SUBMITTED','PROCESSING','VALIDATED','REJECTED')),
  submitted_at timestamptz,
  last_checked_at timestamptz,
  validated_at timestamptz,
  error_code text,
  error_message text,
  response_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index einvoice_submissions_org_idx on einvoice_submissions(organization_id);
create index einvoice_submissions_invoice_idx on einvoice_submissions(invoice_id);
create trigger einvoice_submissions_set_updated_at before update on einvoice_submissions
  for each row execute function set_updated_at();

-- Append-only audit trail: no application role is granted UPDATE/DELETE (see RLS migration).
create table einvoice_submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references einvoice_submissions(id) on delete cascade,
  event_type text not null,
  status_before text,
  status_after text,
  payload jsonb,
  occurred_at timestamptz not null default now()
);

create index einvoice_submission_events_submission_idx on einvoice_submission_events(submission_id);
