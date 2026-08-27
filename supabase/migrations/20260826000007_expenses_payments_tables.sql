-- Expenses and payments (an invoice or expense can have multiple partial payments).

create table expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  expense_date date not null,
  category text,
  description text,
  amount numeric(14,2) not null,
  vat_amount numeric(14,2) not null default 0,
  currency text not null,
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID','PARTIALLY_PAID','PAID')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_org_idx on expenses(organization_id);
create index expenses_supplier_idx on expenses(supplier_id);
create index expenses_project_idx on expenses(project_id);
create trigger expenses_set_updated_at before update on expenses
  for each row execute function set_updated_at();

create table payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete set null,
  expense_id uuid references expenses(id) on delete set null,
  amount numeric(14,2) not null,
  currency text not null,
  payment_date date not null,
  payment_method text not null check (payment_method in ('BANK_TRANSFER','CASH','CARD','OTHER')),
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  check (
    (invoice_id is not null and expense_id is null) or
    (invoice_id is null and expense_id is not null)
  )
);

create index payments_org_idx on payments(organization_id);
create index payments_invoice_idx on payments(invoice_id);
create index payments_expense_idx on payments(expense_id);
