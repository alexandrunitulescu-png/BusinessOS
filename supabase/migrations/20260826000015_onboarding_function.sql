-- Onboarding creates 4-5 rows across as many tables (organization, the owner's
-- membership, an invoice series, optionally a bank account, a trial
-- subscription). Doing that as separate client calls risks a half-created
-- organization if one step fails partway through. This wraps all of it in one
-- transaction. SECURITY INVOKER (the default) — it runs as the calling user,
-- so every insert still goes through the exact same RLS policies as if the
-- client had issued them one at a time; only the atomicity changes.
create or replace function create_organization(
  p_entity_type text,
  p_legal_name text,
  p_trade_name text,
  p_cui text,
  p_registration_number text,
  p_address_line text,
  p_city text,
  p_county text,
  p_postal_code text,
  p_vat_registered boolean,
  p_vat_code text,
  p_default_currency text,
  p_invoice_series text,
  p_invoice_next_number integer,
  p_iban text,
  p_bank_name text
)
returns uuid
language plpgsql
as $$
declare
  v_org_id uuid;
  v_free_plan_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into organizations (
    entity_type, legal_name, trade_name, cui, registration_number,
    address_line, city, county, postal_code, vat_registered, vat_code, default_currency
  ) values (
    p_entity_type, p_legal_name, nullif(p_trade_name, ''), p_cui, nullif(p_registration_number, ''),
    p_address_line, p_city, p_county, nullif(p_postal_code, ''), p_vat_registered, nullif(p_vat_code, ''), p_default_currency
  )
  returning id into v_org_id;

  insert into organization_users (organization_id, user_id, role, status, joined_at)
  values (v_org_id, auth.uid(), 'OWNER', 'ACTIVE', now());

  insert into invoice_series (organization_id, series, next_number, is_default)
  values (v_org_id, upper(p_invoice_series), p_invoice_next_number, true);

  if p_iban is not null and p_iban <> '' then
    insert into organization_bank_accounts (organization_id, iban, bank_name, currency, is_default)
    values (v_org_id, p_iban, nullif(p_bank_name, ''), p_default_currency, true);
  end if;

  select id into v_free_plan_id from plans where code = 'FREE';
  if v_free_plan_id is not null then
    insert into subscriptions (organization_id, plan_id, status, trial_ends_at)
    values (v_org_id, v_free_plan_id, 'TRIAL', now() + interval '14 days');
  end if;

  return v_org_id;
end;
$$;

grant execute on function create_organization(
  text, text, text, text, text, text, text, text, text, boolean, text, text, text, integer, text, text
) to authenticated;
