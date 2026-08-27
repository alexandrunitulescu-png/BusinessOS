-- Placeholder plan catalog so onboarding has a FREE/TRIAL plan to assign new
-- organizations to. Prices, limits and feature sets below are illustrative —
-- confirm real numbers before this reaches paying customers (M9).

insert into plans (code, name, price, currency, limits, features) values
  ('FREE', 'Free', 0, 'RON',
    '{"users": 2, "invoices_per_month": 15, "storage_mb": 200}',
    '{"CRM": true, "PROJECTS": true, "EXPENSES": true, "DOCUMENTS": true, "EMPLOYEES": false, "EFACTURA": false, "AUTOMATIONS": false}'),
  ('STARTER', 'Starter', 49, 'RON',
    '{"users": 3, "invoices_per_month": 50, "storage_mb": 1000}',
    '{"CRM": true, "PROJECTS": true, "EXPENSES": true, "DOCUMENTS": true, "EMPLOYEES": false, "EFACTURA": true, "AUTOMATIONS": false}'),
  ('PRO', 'Pro', 129, 'RON',
    '{"users": 10, "invoices_per_month": 300, "storage_mb": 5000}',
    '{"CRM": true, "PROJECTS": true, "EXPENSES": true, "DOCUMENTS": true, "EMPLOYEES": true, "EFACTURA": true, "AUTOMATIONS": false}'),
  ('BUSINESS', 'Business', 299, 'RON',
    '{"users": 25, "invoices_per_month": 1000, "storage_mb": 20000}',
    '{"CRM": true, "PROJECTS": true, "EXPENSES": true, "DOCUMENTS": true, "EMPLOYEES": true, "EFACTURA": true, "AUTOMATIONS": true}')
on conflict (code) do nothing;
