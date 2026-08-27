export const FEATURE_KEYS = [
  "CRM",
  "PROJECTS",
  "EXPENSES",
  "DOCUMENTS",
  "EMPLOYEES",
  "EFACTURA",
  "AUTOMATIONS",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  CRM: "Clienți & furnizori",
  PROJECTS: "Proiecte",
  EXPENSES: "Cheltuieli",
  DOCUMENTS: "Documente",
  EMPLOYEES: "Angajați",
  EFACTURA: "e-Factura",
  AUTOMATIONS: "Automatizări",
};

/** Publicly selectable plans (the self-serve switcher + comparison grid). */
export const PLAN_CODES = ["FREE", "STARTER", "PRO", "BUSINESS"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

/**
 * Every plan code, incl. INTERNAL — the free/unlimited complimentary plan that
 * only a platform admin can assign (see lib/admin/mutations.ts). Never offered
 * to org owners and hidden from listPlans().
 */
export const ALL_PLAN_CODES = [...PLAN_CODES, "INTERNAL"] as const;
export type AnyPlanCode = (typeof ALL_PLAN_CODES)[number];

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  TRIAL: "Perioadă de probă",
  ACTIVE: "Activ",
  PAST_DUE: "Restanță la plată",
  CANCELLED: "Anulat",
};

export type PlanLimits = {
  users: number | null;
  invoices_per_month: number | null;
  storage_mb: number | null;
};
