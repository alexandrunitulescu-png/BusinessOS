import { requireActiveMembership } from "@/lib/auth/session";
import { AppShell } from "@/components/shell/AppShell";
import { navGroupsForRole } from "@/lib/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, membership, memberships } = await requireActiveMembership();
  const orgName = membership.tradeName || membership.legalName;

  return (
    <AppShell
      navGroups={navGroupsForRole(membership.role)}
      memberships={memberships}
      activeOrgId={membership.id}
      orgName={orgName}
      userEmail={user.email ?? ""}
    >
      {children}
    </AppShell>
  );
}
