-- M12 — extend the minimal `employees` registry (M0 §72 "evidență minimă
-- angajați, fără payroll") with the HR fields the user needs: contract details,
-- base salary, CNP, IBAN.
--
-- CNP is sensitive PII. It stays in this table, which is already OWNER/ADMIN-only
-- at the RLS layer (employees_* policies, migration 20260826000012) — no policy
-- or grant change is needed. The app keeps CNP out of list views and out of
-- audit_logs metadata (audit rows are readable by any org member).

alter table employees
  add column if not exists cnp text,
  add column if not exists department text,
  add column if not exists contract_type text
    check (contract_type in ('CIM_NEDETERMINAT','CIM_DETERMINAT','PART_TIME','INTERNSHIP','COLABORARE','ALT')),
  add column if not exists contract_start_date date,
  add column if not exists contract_end_date date,
  add column if not exists base_salary numeric(12,2),
  add column if not exists salary_currency text not null default 'RON',
  add column if not exists iban text,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists employees_set_updated_at on employees;
create trigger employees_set_updated_at before update on employees
  for each row execute function set_updated_at();
