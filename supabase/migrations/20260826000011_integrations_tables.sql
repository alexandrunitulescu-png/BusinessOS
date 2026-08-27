-- Outbound webhooks (n8n / external automation, not built as an in-app automation
-- builder in the MVP).

create table webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  secret text not null,
  event_types text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index webhook_endpoints_org_idx on webhook_endpoints(organization_id);
create trigger webhook_endpoints_set_updated_at before update on webhook_endpoints
  for each row execute function set_updated_at();

create table webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_endpoint_id uuid not null references webhook_endpoints(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING','SUCCESS','FAILED')),
  response_code integer,
  attempt_count integer not null default 0,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index webhook_deliveries_endpoint_idx on webhook_deliveries(webhook_endpoint_id);
