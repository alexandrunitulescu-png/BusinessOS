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

export const PLAN_CODES = ["FREE", "STARTER", "PRO", "BUSINESS"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

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
