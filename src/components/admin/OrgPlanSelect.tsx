"use client";

import { useState, useTransition } from "react";
import { setOrgPlanAction } from "@/lib/admin/mutations";
import { ALL_PLAN_CODES, type AnyPlanCode } from "@/lib/billing/constants";

/**
 * Per-row plan picker for the platform-admin org table. Changes apply
 * immediately (no payment provider). INTERNAL is selectable here only.
 */
export function OrgPlanSelect({
  organizationId,
  currentCode,
}: {
  organizationId: string;
  currentCode: AnyPlanCode | null;
}) {
  const [value, setValue] = useState<string>(currentCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onChange(next: string) {
    setValue(next);
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await setOrgPlanAction(organizationId, next as AnyPlanCode);
      if (res?.error) {
        setError(res.error);
        setValue(currentCode ?? "");
      } else {
        setDone(true);
      }
    });
  }

  return (
    <div className="flex flex-col gap-0.5">
      <select
        value={value}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border-strong bg-surface-raised px-2 py-1 text-sm text-text outline-none focus:border-brand disabled:opacity-50"
      >
        {!currentCode && <option value="">—</option>}
        {ALL_PLAN_CODES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      {isPending && <span className="text-xs text-text-subtle">Se salvează…</span>}
      {done && !isPending && <span className="text-xs text-positive">Salvat</span>}
      {error && <span className="text-xs text-critical">{error}</span>}
    </div>
  );
}
