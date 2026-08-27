-- products_services was created without an updated_at column while clients and
-- suppliers both have one. Catalog items are edited in M3, so bring the table in
-- line: add the column, backfill from created_at, and attach the shared trigger.

alter table products_services
  add column if not exists updated_at timestamptz not null default now();

update products_services set updated_at = created_at where updated_at < created_at;

drop trigger if exists products_services_set_updated_at on products_services;
create trigger products_services_set_updated_at
  before update on products_services
  for each row execute function set_updated_at();
