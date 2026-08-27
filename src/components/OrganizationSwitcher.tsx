"use client";

import { useTransition } from "react";
import { switchActiveOrganizationAction } from "@/lib/organizations/mutations";
import type { OrganizationMembership } from "@/lib/organizations/types";

export function OrganizationSwitcher({
  memberships,
  activeId,
}: {
  memberships: OrganizationMembership[];
  activeId: string;
}) {
  const [isPending, startTransition] = useTransition();

  if (memberships.length <= 1) {
    const only = memberships[0];
    return (
      <div className="truncate text-sm font-medium text-slate-900">
        {only?.tradeName || only?.legalName}
      </div>
    );
  }

  return (
    <select
      value={activeId}
      disabled={isPending}
      onChange={(e) => {
        const organizationId = e.target.value;
        startTransition(() => {
          switchActiveOrganizationAction(organizationId);
        });
      }}
      className="w-full truncate rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-900 outline-none"
    >
      {memberships.map((m) => (
        <option key={m.id} value={m.id}>
          {m.tradeName || m.legalName}
        </option>
      ))}
    </select>
  );
}
