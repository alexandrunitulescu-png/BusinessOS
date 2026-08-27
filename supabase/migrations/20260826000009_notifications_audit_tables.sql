-- Notifications and audit log. audit_logs is append-only: no UPDATE/DELETE grant (see RLS migration).

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  channel text not null check (channel in ('IN_APP','EMAIL')),
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_org_idx on notifications(organization_id);
create index notifications_user_idx on notifications(user_id);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_org_idx on audit_logs(organization_id);
