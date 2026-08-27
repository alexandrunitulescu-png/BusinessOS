-- A DRAFT invoice has no series/number yet — those are allocated atomically by
-- issue_invoice() (migration 20260827000002) when it leaves DRAFT. The original
-- schema declared both columns NOT NULL, which makes it impossible to insert a
-- draft. Relax to nullable; the unique(organization_id, series, number)
-- constraint still enforces uniqueness once issued (Postgres treats the NULLs on
-- drafts as distinct, so any number of drafts coexist).
alter table invoices alter column series drop not null;
alter table invoices alter column number drop not null;
