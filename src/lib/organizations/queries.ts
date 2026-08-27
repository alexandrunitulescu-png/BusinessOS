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
