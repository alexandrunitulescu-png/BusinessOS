-- Atomic invoice-number allocation. A DRAFT invoice has no series/number yet;
-- issuing it must lock the series row, take the next number, bump the counter
-- and freeze the number onto the invoice in a single transaction so two
-- concurrent issues can never get the same number (M0 §4).
--
-- SECURITY INVOKER (default): every statement below still goes through the exact
-- same RLS policies as if the client had issued them — only atomicity changes.
-- So a role without invoices/invoice_series UPDATE (READ_ONLY) gets a policy
-- error here, which is the correct outcome.
create or replace function issue_invoice(p_invoice_id uuid)
returns table (out_series text, out_number integer)
language plpgsql
as $$
declare
  v_series_id uuid;
  v_status text;
  v_line_count integer;
  v_series text;
  v_next integer;
begin
  select series_id, status into v_series_id, v_status
  from invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Factura nu există sau nu ai acces la ea';
  end if;

  if v_status <> 'DRAFT' then
    raise exception 'Doar facturile în ciornă pot fi emise';
  end if;

  select count(*) into v_line_count from invoice_lines where invoice_id = p_invoice_id;
  if v_line_count = 0 then
    raise exception 'Factura nu are nicio linie';
  end if;

  -- Serialize concurrent issues on the same series.
  select series, next_number into v_series, v_next
  from invoice_series
  where id = v_series_id
  for update;

  if not found then
    raise exception 'Seria de facturare nu există';
  end if;

  update invoice_series set next_number = next_number + 1 where id = v_series_id;

  update invoices
  set series = v_series,
      number = v_next,
      status = 'ISSUED',
      updated_at = now()
  where id = p_invoice_id;

  out_series := v_series;
  out_number := v_next;
  return next;
end;
$$;

grant execute on function issue_invoice(uuid) to authenticated;

-- invoice_lines are details of an invoice, not standalone entities. Once an
-- invoice leaves DRAFT its lines are fiscally frozen, and an ACCOUNTANT (money
-- RW per the M0 matrix) must be able to fully edit a draft's lines — including
-- removing them, which the original policy set (delete = OWNER/ADMIN only)
-- didn't allow. Re-scope all three writes to "parent invoice is DRAFT" and add
-- ACCOUNTANT to delete.
drop policy if exists invoice_lines_insert on invoice_lines;
drop policy if exists invoice_lines_update on invoice_lines;
drop policy if exists invoice_lines_delete on invoice_lines;

create policy invoice_lines_insert on invoice_lines for insert
  with check (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and i.status = 'DRAFT'
      and has_org_role(i.organization_id, array['OWNER','ADMIN','ACCOUNTANT'])
  ));

create policy invoice_lines_update on invoice_lines for update
  using (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and i.status = 'DRAFT'
      and has_org_role(i.organization_id, array['OWNER','ADMIN','ACCOUNTANT'])
  ))
  with check (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and i.status = 'DRAFT'
      and has_org_role(i.organization_id, array['OWNER','ADMIN','ACCOUNTANT'])
  ));

create policy invoice_lines_delete on invoice_lines for delete
  using (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and i.status = 'DRAFT'
      and has_org_role(i.organization_id, array['OWNER','ADMIN','ACCOUNTANT'])
  ));

-- The default bank account (IBAN) is printed on every invoice, so anyone who can
-- read invoices needs to read it too — not just OWNER/ADMIN. Writes stay admin-only.
drop policy if exists bank_accounts_select on organization_bank_accounts;
create policy bank_accounts_select on organization_bank_accounts for select
  using (has_org_role(organization_id, array['OWNER','ADMIN','ACCOUNTANT','READ_ONLY']));
