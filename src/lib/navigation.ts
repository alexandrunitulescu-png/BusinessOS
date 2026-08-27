import type { OrganizationRole, Resource } from "@/lib/auth/rbac";
import { hasPermission } from "@/lib/auth/rbac";
import type { IconName } from "@/components/shell/icons";

/**
 * Single source of truth for the app-shell navigation. Each item maps to an
 * RBAC {@link Resource} so the sidebar hides sections the current role can't
 * read — the same matrix enforced server-side and in RLS.
 *
 * `available: false` marks a section whose feature ships in a later milestone;
 * the route still renders a placeholder so links never 404 during a demo.
 */
export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Resource gate; `null` means visible to any organization member. */
  resource: Resource | null;
  available: boolean;
};

export type NavGroup = {
  title: string | null;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    items: [
      { label: "Panou principal", href: "/dashboard", icon: "home", resource: null, available: true },
    ],
  },
  {
    title: "Afacere",
    items: [
      { label: "Clienți", href: "/clients", icon: "users", resource: "business", available: true },
      { label: "Furnizori", href: "/suppliers", icon: "truck", resource: "business", available: true },
      { label: "Produse & servicii", href: "/catalog", icon: "tag", resource: "catalog", available: true },
      { label: "Proiecte", href: "/projects", icon: "folder", resource: "business", available: true },
    ],
  },
  {
    title: "Bani",
    items: [
      { label: "Facturi", href: "/invoices", icon: "file-text", resource: "money", available: true },
      { label: "Cheltuieli", href: "/expenses", icon: "receipt", resource: "money", available: false },
      { label: "Încasări & plăți", href: "/payments", icon: "wallet", resource: "money", available: false },
      { label: "Rapoarte", href: "/reports", icon: "bar-chart", resource: "money", available: false },
    ],
  },
  {
    title: "Organizație",
    items: [
      { label: "Documente", href: "/documents", icon: "paperclip", resource: "catalog", available: false },
      { label: "Angajați", href: "/employees", icon: "id-card", resource: "employees", available: false },
      { label: "Integrări", href: "/integrations", icon: "plug", resource: "settings", available: false },
      { label: "Setări", href: "/settings", icon: "settings", resource: "settings", available: false },
    ],
  },
];

/** Flat label lookup for breadcrumbs. */
export const HREF_LABELS: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items).map((i) => [i.href, i.label]),
);

/** Returns the nav groups the given role is allowed to see (empty groups dropped). */
export function navGroupsForRole(role: OrganizationRole): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => item.resource === null || hasPermission(role, item.resource, "read"),
    ),
  })).filter((group) => group.items.length > 0);
}
