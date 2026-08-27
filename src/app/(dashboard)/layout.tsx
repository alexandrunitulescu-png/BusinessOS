import { requireActiveMembership } from "@/lib/auth/session";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { signOutAction } from "@/lib/auth/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { membership, memberships } = await requireActiveMembership();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-900">BusinessOS</span>
          <div className="w-48">
            <OrganizationSwitcher memberships={memberships} activeId={membership.id} />
          </div>
        </div>
        <form action={signOutAction}>
          <button className="text-sm text-slate-500 hover:text-slate-900" type="submit">
            Ieși din cont
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
