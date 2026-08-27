-- Usage metering for plan limits (M0 §12 — "usage_tracking se actualizează din
-- evenimentele de domeniu, nu COUNT(*) la citire"). This trigger is the
-- domain-event handler for invoice.created / invoice.deleted: it keeps a
-- per-month counter of invoices created, keyed by the invoice's own created_at
-- month so deleting a draft frees the slot again.
--
-- SECURITY DEFINER: usage_tracking has no client write policy on purpose.

create or replace function bump_invoice_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_created timestamptz;
  v_delta int;
  v_start date;
  v_end date;
begin
  if tg_op = 'INSERT' then
    v_org := new.organization_id; v_created := new.created_at; v_delta := 1;
  else
    v_org := old.organization_id; v_created := old.created_at; v_delta := -1;
  end if;

  v_start := date_trunc('month', v_created)::date;
  v_end := (date_trunc('month', v_created) + interval '1 month' - interval '1 day')::date;

  insert into usage_tracking (organization_id, metric, period_start, period_end, value)
  values (v_org, 'invoices_created', v_start, v_end, greatest(v_delta, 0))
  on conflict (organization_id, metric, period_start)
  do update set value = greatest(usage_tracking.value + v_delta, 0), updated_at = now();

  return null;
end;
$$;

drop trigger if exists invoices_usage_track on invoices;
create trigger invoices_usage_track
  after insert or delete on invoices
  for each row execute function bump_invoice_usage();

-- Backfill the current + previous month so existing invoices are counted.
insert into usage_tracking (organization_id, metric, period_start, period_end, value)
select
  organization_id,
  'invoices_created',
  date_trunc('month', created_at)::date,
  (date_trunc('month', created_at) + interval '1 month' - interval '1 day')::date,
  count(*)
from invoices
where created_at >= date_trunc('month', now()) - interval '1 month'
group by organization_id, date_trunc('month', created_at)
on conflict (organization_id, metric, period_start)
do update set value = excluded.value, updated_at = now();
