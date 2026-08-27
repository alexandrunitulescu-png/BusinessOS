"use client";

import { useState, useTransition } from "react";
import { changePlanAction } from "@/lib/billing/mutations";
import {
  FEATURE_LABELS,
  FEATURE_KEYS,
  type AnyPlanCode,
  type PlanCode,
} from "@/lib/billing/constants";
import type { PlanInfo } from "@/lib/billing/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/shell/icons";
import { formatMoney, formatNumber } from "@/lib/format";

export function PlanSwitcher({
  plans,
  currentCode,
  canManage,
}: {
  plans: PlanInfo[];
  currentCode: AnyPlanCode;
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<PlanCode | null>(null);
  const [isPending, startTransition] = useTransition();

  function choose(code: PlanCode) {
    setError(null);
    setPendingCode(code);
    startTransition(async () => {
      const result = await changePlanAction(code);
      if (result?.error) setError(result.error);
      setPendingCode(null);
    });
  }

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const current = plan.code === currentCode;
          const limit = (n: number | null) => (n === null ? "nelimitat" : formatNumber(n));
          return (
            <div
              key={plan.code}
              className={`rounded-xl border p-4 ${
                current ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
                {current && (
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[0.625rem] font-medium text-white">
                    curent
                  </span>
                )}
              </div>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {plan.price ? `${formatMoney(plan.price, plan.currency)}/lună` : "Gratuit"}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-slate-500">
                <li>{limit(plan.limits.invoices_per_month)} facturi / lună</li>
                <li>{limit(plan.limits.users)} utilizatori</li>
                <li>{limit(plan.limits.storage_mb)} MB stocare</li>
              </ul>
              <ul className="mt-2 space-y-0.5 text-xs">
                {FEATURE_KEYS.map((key) => (
                  <li
                    key={key}
                    className={`flex items-center gap-1 ${
                      plan.features[key] ? "text-slate-600" : "text-slate-300"
                    }`}
                  >
                    <Icon name={plan.features[key] ? "plus" : "close"} className="h-3 w-3" />
                    {FEATURE_LABELS[key]}
                  </li>
                ))}
              </ul>
              {!current && canManage && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  className="mt-3 w-full"
                  // listPlans() never returns INTERNAL, so this is always a public code.
                  onClick={() => choose(plan.code as PlanCode)}
                >
                  {isPending && pendingCode === plan.code ? "Se schimbă…" : "Alege planul"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {canManage && (
        <p className="mt-2 text-xs text-slate-400">
          Nu există plată online încă — schimbarea planului este imediată.
        </p>
      )}
    </div>
  );
}
