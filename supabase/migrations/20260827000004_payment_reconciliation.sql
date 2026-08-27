-- Deleting an invoice or expense that has payments would set payments.invoice_id
-- / expense_id to NULL and break the "exactly one target" CHECK constraint.
-- Cascade the delete instead — a payment has no meaning without its target.
-- Drop whatever FK currently sits on each column (name is implementation-defined)
-- and re-add it with ON DELETE CASCADE.
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.payments'::regclass
      and con.contype = 'f'
      and att.attname in ('invoice_id', 'expense_id')
  loop
    execute format('alter table payments drop constraint %I', r.conname);
  end loop;
end $$;

alter table payments add constraint payments_invoice_id_fkey
  foreign key (invoice_id) references invoices(id) on delete cascade;
alter table payments add constraint payments_expense_id_fkey
  foreign key (expense_id) references expenses(id) on delete cascade;

-- Payment reconciliation (M0 §40, "reconciliere plăți parțiale"). A trigger on
-- `payments` recomputes the parent invoice's `status` / expense's
-- `payment_status` from the sum of its payments after every insert / update /
-- delete, so the parent always reflects reality no matter how payments change.
--
-- SECURITY DEFINER: the recompute must succeed regardless of who inserted the
-- payment, and it only ever touches the one parent row addressed by id.

create or replace function reconcile_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric(14,2);
  v_paid numeric(14,2);
begin
  select total into v_total from invoices where id = p_invoice_id;
  if not found then return; end if;

  select coalesce(sum(amount), 0) into v_paid from payments where invoice_id = p_invoice_id;

  update invoices
  set status = case
        when v_total > 0 and v_paid >= v_total then 'PAID'
        when v_paid > 0 then 'PARTIALLY_PAID'
        when status in ('PAID', 'PARTIALLY_PAID') then 'ISSUED'
        else status
      end,
      updated_at = now()
  where id = p_invoice_id
    and status not in ('DRAFT', 'CANCELLED');
end;
$$;

create or replace function reconcile_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric(14,2);
  v_paid numeric(14,2);
begin
  select amount into v_amount from expenses where id = p_expense_id;
  if not found then return; end if;

  select coalesce(sum(amount), 0) into v_paid from payments where expense_id = p_expense_id;

  update expenses
  set payment_status = case
        when v_amount > 0 and v_paid >= v_amount then 'PAID'
        when v_paid > 0 then 'PARTIALLY_PAID'
        else 'UNPAID'
      end,
      updated_at = now()
  where id = p_expense_id;
end;
$$;

create or replace function on_payment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('DELETE', 'UPDATE') then
    if old.invoice_id is not null then perform reconcile_invoice(old.invoice_id); end if;
    if old.expense_id is not null then perform reconcile_expense(old.expense_id); end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    if new.invoice_id is not null then perform reconcile_invoice(new.invoice_id); end if;
    if new.expense_id is not null then perform reconcile_expense(new.expense_id); end if;
  end if;
  return null;
end;
$$;

drop trigger if exists payments_reconcile on payments;
create trigger payments_reconcile
  after insert or update or delete on payments
  for each row execute function on_payment_change();

-- Editing an expense's amount can change whether its existing payments cover it,
-- so re-reconcile then too. (Invoice totals are frozen after issue, so no
-- equivalent trigger is needed there.) The recompute updates only
-- payment_status / updated_at, never `amount`, so this trigger can't recurse.
create or replace function on_expense_amount_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.amount is distinct from old.amount then
    perform reconcile_expense(new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists expenses_reconcile on expenses;
create trigger expenses_reconcile
  after update of amount on expenses
  for each row execute function on_expense_amount_change();
