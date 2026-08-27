import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationMembership } from "@/lib/organizations/types";
import type { OrganizationRole } from "@/lib/auth/rbac";

type OrgUserRow = {
  role: OrganizationRole;
  organization: {
    id: string;
    legal_name: string;
    trade_name: string | null;
    default_currency: string;
  } | null;
};

export type OrganizationBillingInfo = {
  legalName: string;
  tradeName: string | null;
  entityType: string;
  cui: string;
  registrationNumber: string | null;
  vatRegistered: boolean;
  vatCode: string | null;
  addressLine: string | null;
  city: string | null;
  county: string | null;
  postalCode: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  iban: string | null;
  bankName: string | null;
};

/** Full company details + default bank account, for rendering an invoice. */
export async function getOrganizationBillingInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  organizationId: string,
): Promise<OrganizationBillingInfo | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "legal_name, trade_name, entity_type, cui, registration_number, vat_registered, vat_code, address_line, city, county, postal_code, country, email, phone",
    )
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: bank } = await supabase
    .from("organization_bank_accounts")
    .select("iban, bank_name, is_default")
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    legalName: data.legal_name,
    tradeName: data.trade_name ?? null,
    entityType: data.entity_type,
    cui: data.cui,
    registrationNumber: data.registration_number ?? null,
    vatRegistered: data.vat_registered === true,
    vatCode: data.vat_code ?? null,
    addressLine: data.address_line ?? null,
    city: data.city ?? null,
    county: data.county ?? null,
    postalCode: data.postal_code ?? null,
    country: data.country ?? "RO",
    email: data.email ?? null,
    phone: data.phone ?? null,
    iban: bank?.iban ?? null,
    bankName: bank?.bank_name ?? null,
  };
}

/** Every active organization the current user belongs to, with their role in each. */
export async function getUserMemberships(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<OrganizationMembership[]> {
  const { data, error } = await supabase
    .from("organization_users")
    .select("role, organization:organizations(id, legal_name, trade_name, default_currency)")
    .eq("status", "ACTIVE")
    .returns<OrgUserRow[]>();

  if (error) throw error;

  return (data ?? [])
    .filter((row): row is OrgUserRow & { organization: NonNullable<OrgUserRow["organization"]> } =>
      row.organization !== null,
    )
    .map((row) => ({
      id: row.organization.id,
      legalName: row.organization.legal_name,
      tradeName: row.organization.trade_name,
      defaultCurrency: row.organization.default_currency,
      role: row.role,
    }));
}
