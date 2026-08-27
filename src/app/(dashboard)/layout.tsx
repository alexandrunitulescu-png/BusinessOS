import { requireActiveMembership } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/platform";
import { getEntitlements } from "@/lib/billing/entitlements";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/billing/constants";
import { AppShell } from "@/components/shell/AppShell";
import { navGroupsFor } from "@/lib/navigation";

const ALL_FEATURES_ON = Object.fromEntries(
  FEATURE_KEYS.map((k) => [k, true]),
) as Record<FeatureKey, boolean>;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, membership, memberships } = await requireActiveMembership();
  const orgName = membership.tradeName || membership.legalName;

  const [entitlements, platformAdmin] = await Promise.all([
    getEntitlements(supabase, membership.id),
    isPlatformAdmin(supabase),
  ]);
  const features = entitlements?.features ?? ALL_FEATURES_ON;

  return (
    <AppShell
      navGroups={navGroupsFor(membership.role, features, { isPlatformAdmin: platformAdmin })}
      memberships={memberships}
      activeOrgId={membership.id}
      orgName={orgName}
      userEmail={user.email ?? ""}
    >
      {children}
    </AppShell>
  );
}
