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
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:opacity-50"
      >
        {!currentCode && <option value="">—</option>}
        {ALL_PLAN_CODES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      {isPending && <span className="text-xs text-slate-400">Se salvează…</span>}
      {done && !isPending && <span className="text-xs text-emerald-600">Salvat</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
