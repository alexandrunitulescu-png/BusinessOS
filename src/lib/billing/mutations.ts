"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionContext } from "@/lib/auth/membership";
import { hasPermission } from "@/lib/auth/rbac";
import { PLAN_CODES, type PlanCode } from "@/lib/billing/constants";
import { writeAudit } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export type MutationResult = { error: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (db: unknown) => db as SupabaseClient<any>;

/**
 * Switches the organization's plan. No payment provider yet (M0 §12 — schema is
 * ready for one, but Stripe isn't wired), so the change is immediate and the
 * subscription is marked ACTIVE, clearing any trial.
 */
export async function changePlanAction(planCode: PlanCode): Promise<MutationResult> {
  if (!(PLAN_CODES as readonly string[]).includes(planCode)) {
    return { error: "Plan necunoscut." };
  }

  const ctx = await getActionContext();
  if (!ctx.ok) return { error: ctx.error };
  if (!hasPermission(ctx.membership.role, "settings", "write")) {
    return { error: "Doar proprietarul sau un administrator poate schimba planul." };
  }
  const supabase = loose(ctx.supabase);

  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select("id")
    .eq("code", planCode)
    .maybeSingle();
  if (planErr) return { error: planErr.message };
  if (!plan) return { error: "Planul nu există în catalog." };

  const { data: previous } = await supabase
    .from("subscriptions")
    .select("plan:plans(code)")
    .eq("organization_id", ctx.membership.id)
    .maybeSingle();
  // postgrest-js infers nested selects on the loose client as `never` — mirror
  // the `as unknown as` cast used in lib/billing/entitlements.ts.
  type PlanCodeRow = { code?: string | null };
  const prevPlan = (previous as unknown as { plan?: PlanCodeRow | PlanCodeRow[] } | null)?.plan;
  const previousCode = (Array.isArray(prevPlan) ? prevPlan[0]?.code : prevPlan?.code) ?? null;

  const { error } = await supabase
    .from("subscriptions")
    .update({ plan_id: plan.id, status: "ACTIVE", trial_ends_at: null })
    .eq("organization_id", ctx.membership.id);
  if (error) return { error: error.message };

  await writeAudit(supabase, {
    organizationId: ctx.membership.id,
    userId: ctx.userId,
    action: AUDIT_ACTIONS.PLAN_CHANGED,
    entityType: "subscription",
    entityId: ctx.membership.id,
    metadata: { from: previousCode, to: planCode },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard", "layout");
  return { error: null };
}
