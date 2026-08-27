-- Invoicing engine: series, invoices, lines.

create table invoice_series (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  series text not null,
  next_number integer not null default 1,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, series)
);

create index invoice_series_org_idx on invoice_series(organization_id);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id),
  project_id uuid references projects(id) on delete set null,
  series_id uuid not null references invoice_series(id),
  series text not null,
  number integer not null,
  issue_date date not null,
  due_date date,
  currency text not null,
  exchange_rate numeric(12,6),
  subtotal numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  payment_terms text,
  status text not null default 'DRAFT' check (status in ('DRAFT','ISSUED','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED')),
  einvoice_status text not null default 'NOT_REQUIRED' check (einvoice_status in ('NOT_REQUIRED','NOT_SENT','QUEUED','SUBMITTED','PROCESSING','VALIDATED','REJECTED')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, series, number)
);

create index invoices_org_idx on invoices(organization_id);
create index invoices_client_idx on invoices(client_id);
create index invoices_project_idx on invoices(project_id);
create trigger invoices_set_updated_at before update on invoices
  for each row execute function set_updated_at();

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  product_service_id uuid references products_services(id) on delete set null,
  description text not null,
  quantity numeric(14,4) not null default 1,
  unit text not null default 'buc',
  unit_price numeric(14,2) not null,
  vat_rate numeric(5,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  line_total numeric(14,2) not null,
  sort_order integer not null default 0
);

create index invoice_lines_invoice_idx on invoice_lines(invoice_id);
