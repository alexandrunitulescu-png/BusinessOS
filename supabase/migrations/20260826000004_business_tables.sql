-- CRM, catalog, projects.

create table clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('PERSON','COMPANY')),
  company_name text,
  cui text,
  registration_number text,
  first_name text,
  last_name text,
  contact_person text,
  email text,
  phone text,
  address_line text,
  city text,
  county text,
  country text default 'RO',
  iban text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_org_idx on clients(organization_id);
create trigger clients_set_updated_at before update on clients
  for each row execute function set_updated_at();

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('PERSON','COMPANY')),
  company_name text,
  cui text,
  registration_number text,
  contact_person text,
  email text,
  phone text,
  address_line text,
  city text,
  county text,
  country text default 'RO',
  iban text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suppliers_org_idx on suppliers(organization_id);
create trigger suppliers_set_updated_at before update on suppliers
  for each row execute function set_updated_at();

create table products_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('PRODUCT','SERVICE')),
  name text not null,
  description text,
  sku text,
  unit text not null default 'buc',
  price numeric(14,2) not null,
  currency text not null,
  vat_rate numeric(5,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index products_services_org_idx on products_services(organization_id);

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'PLANNED' check (status in ('PLANNED','ACTIVE','ON_HOLD','COMPLETED','CANCELLED')),
  start_date date,
  deadline date,
  budget numeric(14,2),
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_org_idx on projects(organization_id);
create index projects_client_idx on projects(client_id);
create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();
