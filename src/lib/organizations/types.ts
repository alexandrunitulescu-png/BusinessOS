import type { OrganizationRole } from "@/lib/auth/rbac";

export type OrganizationSummary = {
  id: string;
  legalName: string;
  tradeName: string | null;
  defaultCurrency: string;
};

export type OrganizationMembership = OrganizationSummary & {
  role: OrganizationRole;
};
