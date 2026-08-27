-- Generic document management (polymorphic) and a minimal employee roster.

create table documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('INVOICE','EXPENSE','CLIENT','SUPPLIER','PROJECT','OTHER')),
  entity_id uuid,
  filename text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index documents_org_idx on documents(organization_id);
create index documents_entity_idx on documents(entity_type, entity_id);

create table employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  job_title text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  hire_date date,
  created_at timestamptz not null default now()
);

create index employees_org_idx on employees(organization_id);
