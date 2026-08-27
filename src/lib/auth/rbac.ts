/**
 * Single source of truth for role → permission checks. Consulted by the UI
 * (hide/disable controls), server actions (authoritative check), and mirrored
 * independently in Postgres RLS (supabase/migrations/..._rls_policies.sql) as
 * the final backstop. Keep the three in sync when a rule changes here.
 */

export type OrganizationRole = "OWNER" | "ADMIN" | "ACCOUNTANT" | "EMPLOYEE" | "READ_ONLY";

export type Resource =
  | "money" // invoices, expenses, payments, reports
  | "business" // clients, suppliers, projects
  | "catalog" // products & services, documents
  | "settings" // organization, users, billing, integrations, e-Factura connection
  | "employees";

export type Action = "read" | "write" | "delete";

const MATRIX: Record<Resource, Record<OrganizationRole, readonly Action[]>> = {
  money: {
    OWNER: ["read", "write", "delete"],
    ADMIN: ["read", "write", "delete"],
    ACCOUNTANT: ["read", "write"],
    EMPLOYEE: [],
    READ_ONLY: ["read"],
  },
  business: {
    OWNER: ["read", "write", "delete"],
    ADMIN: ["read", "write", "delete"],
    ACCOUNTANT: ["read"],
    EMPLOYEE: ["read", "write"],
    READ_ONLY: ["read"],
  },
  catalog: {
    OWNER: ["read", "write", "delete"],
    ADMIN: ["read", "write", "delete"],
    ACCOUNTANT: ["read"],
    EMPLOYEE: ["read", "write"],
    READ_ONLY: ["read"],
  },
  settings: {
    OWNER: ["read", "write", "delete"],
    ADMIN: ["read", "write", "delete"],
    ACCOUNTANT: [],
    EMPLOYEE: [],
    READ_ONLY: [],
  },
  employees: {
    OWNER: ["read", "write", "delete"],
    ADMIN: ["read", "write", "delete"],
    ACCOUNTANT: [],
    EMPLOYEE: [],
    READ_ONLY: [],
  },
};

export function hasPermission(
  role: OrganizationRole,
  resource: Resource,
  action: Action,
): boolean {
  return MATRIX[resource][role].includes(action);
}

export const ADMIN_ROLES: readonly OrganizationRole[] = ["OWNER", "ADMIN"];
