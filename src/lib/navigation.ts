import type { OrganizationRole, Resource } from "@/lib/auth/rbac";
import { hasPermission } from "@/lib/auth/rbac";
import type { FeatureKey } from "@/lib/billing/constants";
import type { IconName } from "@/components/shell/icons";

/**
 * Single source of truth for the app-shell navigation. Each item maps to an
 * RBAC {@link Resource} (hidden if the role can't read it) and, optionally, a
 * plan {@link FeatureKey} (hidden if the org's plan / feature-flags don't
 * include it — M0 §12).
 *
 * `available: false` marks a section whose feature ships in a later milestone;
 * the route still renders a placeholder so links never 404 during a demo.
 */
export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  resource: Resource | null;
  feature: FeatureKey | null;
  available: boolean;
};

export type NavGroup = {
  title: string | null;
  items: NavItem[];
};

/*
 * M13 sidebar reorg (NG plan §12). Groups now read top-to-bottom as the owner's
 * day: home first, then the business, then money, the org, and system last.
 * Future sections attach to the same groups as their milestones land:
 *   · "Centru de atenție" → ACASĂ (M15)   · "Taskuri" → ORGANIZAȚIE (M17)
 *   · "Automatizări" (+ new AUTOMATIZĂRI group, Integrări moves in) (M18)
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Acasă",
    items: [
      { label: "Panou principal", href: "/dashboard", icon: "home", resource: null, feature: null, available: true },
    ],
  },
  {
    title: "Afacere",
    items: [
      { label: "Clienți", href: "/clients", icon: "users", resource: "business", feature: "CRM", available: true },
      { label: "Furnizori", href: "/suppliers", icon: "truck", resource: "business", feature: "CRM", available: true },
      { label: "Produse & servicii", href: "/catalog", icon: "tag", resource: "catalog", feature: "CRM", available: true },
      { label: "Proiecte", href: "/projects", icon: "folder", resource: "business", feature: "PROJECTS", available: true },
    ],
  },
  {
    title: "Financiar",
    items: [
      { label: "Facturi", href: "/invoices", icon: "file-text", resource: "money", feature: null, available: true },
      { label: "Cheltuieli", href: "/expenses", icon: "receipt", resource: "money", feature: "EXPENSES", available: true },
      { label: "Încasări & plăți", href: "/payments", icon: "wallet", resource: "money", feature: null, available: true },
      { label: "Rapoarte", href: "/reports", icon: "bar-chart", resource: "money", feature: null, available: true },
    ],
  },
  {
    title: "Organizație",
    items: [
      { label: "Angajați", href: "/employees", icon: "id-card", resource: "employees", feature: "EMPLOYEES", available: true },
      { label: "Documente", href: "/documents", icon: "paperclip", resource: "catalog", feature: "DOCUMENTS", available: true },
    ],
  },
  {
    title: "Sistem",
    items: [
      { label: "Integrări", href: "/integrations", icon: "plug", resource: "settings", feature: "EFACTURA", available: true },
      { label: "Setări", href: "/settings", icon: "settings", resource: "settings", feature: null, available: true },
    ],
  },
];

/**
 * Platform-staff-only section (M11). Not part of NAV_GROUPS — it's appended by
 * {@link navGroupsFor} only when the caller is a platform admin, never gated by
 * role or plan feature.
 */
export const PLATFORM_ADMIN_GROUP: NavGroup = {
  title: "Platformă",
  items: [
    { label: "Admin platformă", href: "/admin", icon: "shield", resource: null, feature: null, available: true },
  ],
};

/** Flat label lookup for breadcrumbs. */
export const HREF_LABELS: Record<string, string> = Object.fromEntries(
  [...NAV_GROUPS, PLATFORM_ADMIN_GROUP].flatMap((g) => g.items).map((i) => [i.href, i.label]),
);

/** Which feature key (if any) gates a given route — used by page guards. */
export const ROUTE_FEATURE: Record<string, FeatureKey> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items)
    .filter((i) => i.feature)
    .map((i) => [i.href, i.feature as FeatureKey]),
);

/** Nav groups visible for the given role + enabled feature set (empty groups dropped). */
export function navGroupsFor(
  role: OrganizationRole,
  features: Record<FeatureKey, boolean>,
  opts: { isPlatformAdmin?: boolean } = {},
): NavGroup[] {
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        (item.resource === null || hasPermission(role, item.resource, "read")) &&
        (item.feature === null || features[item.feature] === true),
    ),
  })).filter((group) => group.items.length > 0);

  if (opts.isPlatformAdmin) groups.push(PLATFORM_ADMIN_GROUP);
  return groups;
}
