"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/shell/icons";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { UserMenu } from "@/components/shell/UserMenu";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import type { NavGroup } from "@/lib/navigation";
import type { OrganizationMembership } from "@/lib/organizations/types";

export function AppShell({
  navGroups,
  memberships,
  activeOrgId,
  orgName,
  userEmail,
  children,
}: {
  navGroups: NavGroup[];
  memberships: OrganizationMembership[];
  activeOrgId: string;
  orgName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[16rem_1fr]">
      <SidebarPanel
        navGroups={navGroups}
        pathname={pathname}
        className="hidden lg:flex"
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={closeMobile} />
          <SidebarPanel
            navGroups={navGroups}
            pathname={pathname}
            className="relative flex h-full w-64 shadow-xl"
            onNavigate={closeMobile}
          />
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Deschide meniul"
          >
            <Icon name="menu" />
          </button>

          <Breadcrumbs pathname={pathname} className="min-w-0 flex-1" />

          <div className="hidden w-44 sm:block">
            <OrganizationSwitcher memberships={memberships} activeId={activeOrgId} />
          </div>
          <UserMenu email={userEmail} orgName={orgName} />
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarPanel({
  navGroups,
  pathname,
  className = "",
  onNavigate,
}: {
  navGroups: NavGroup[];
  pathname: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <aside className={`flex-col border-r border-slate-200 bg-white ${className}`}>
      <div className="flex h-[3.25rem] items-center gap-2 border-b border-slate-200 px-5">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-xs font-bold text-white">
          B
        </span>
        <span className="text-sm font-semibold text-slate-900">BusinessOS</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group, i) => (
          <div key={group.title ?? `group-${i}`} className={i > 0 ? "mt-6" : ""}>
            {group.title && (
              <p className="px-2 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                {group.title}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        active
                          ? "bg-slate-900 font-medium text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon name={item.icon} className="h-[1.125rem] w-[1.125rem] shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {!item.available && (
                        <span
                          className={`ml-auto rounded px-1 py-px text-[0.625rem] font-medium ${
                            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          curând
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
