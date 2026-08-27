-- Subscriptions, entitlements, and usage metering. No payment provider wired up yet;
-- `subscriptions.provider` / `provider_subscription_id` exist so one can be added later
-- without a schema change.

create table plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('FREE','STARTER','PRO','BUSINESS')),
  name text not null,
  price numeric(10,2),
  currency text default 'RON',
  limits jsonb not null default '{}',
  features jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status text not null default 'TRIAL' check (status in ('TRIAL','ACTIVE','PAST_DUE','CANCELLED')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  provider text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create index subscriptions_org_idx on subscriptions(organization_id);
create trigger subscriptions_set_updated_at before update on subscriptions
  for each row execute function set_updated_at();

create table usage_tracking (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  metric text not null,
  period_start date not null,
  period_end date not null,
  value numeric(14,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, metric, period_start)
);

create index usage_tracking_org_idx on usage_tracking(organization_id);
create trigger usage_tracking_set_updated_at before update on usage_tracking
  for each row execute function set_updated_at();

create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  feature_key text not null check (feature_key in ('CRM','PROJECTS','EXPENSES','EMPLOYEES','EFACTURA','DOCUMENTS','AUTOMATIONS')),
  enabled boolean not null default true,
  source text not null default 'PLAN' check (source in ('PLAN','OVERRIDE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, feature_key)
);

create index feature_flags_org_idx on feature_flags(organization_id);
create trigger feature_flags_set_updated_at before update on feature_flags
  for each row execute function set_updated_at();
