"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionContext } from "@/lib/auth/membership";
import { isPlatformAdmin } from "@/lib/auth/platform";
import { ALL_PLAN_CODES, type AnyPlanCode } from "@/lib/billing/constants";
import { writeAudit } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export type MutationResult = { error: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (db: unknown) => db as SupabaseClient<any>;

/**
 * Platform-admin action: set any organization's plan, including the
 * complimentary `INTERNAL` plan. Distinct from the self-serve
 * `changePlanAction` (lib/billing/mutations.ts), which only an org OWNER/ADMIN
 * calls and which refuses `INTERNAL`.
 *
 * The `subscriptions` UPDATE is allowed by the `is_platform_admin()` RLS
 * exception (migration 20260827000008).
 */
export async function setOrgPlanAction(
  organizationId: string,
  planCode: AnyPlanCode,
): Promise<MutationResult> {
  if (!(ALL_PLAN_CODES as readonly string[]).includes(planCode)) {
    return { error: "Plan necunoscut." };
  }

  const ctx = await getActionContext();
  if (!ctx.ok) return { error: ctx.error };
  const supabase = loose(ctx.supabase);

  if (!(await isPlatformAdmin(supabase))) {
    return { error: "Doar administratorii platformei pot face această modificare." };
  }

  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select("id, name")
    .eq("code", planCode)
    .maybeSingle();
  if (planErr) return { error: planErr.message };
  if (!plan) return { error: "Planul nu există în catalog." };

  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update({ plan_id: plan.id, status: "ACTIVE", trial_ends_at: null })
    .eq("organization_id", organizationId)
    .select("id");
  if (error) return { error: error.message };
  if (!updated || updated.length === 0) {
    return { error: "Organizația nu are un abonament de modificat." };
  }

  await writeAudit(supabase, {
    organizationId,
    userId: ctx.userId,
    action: AUDIT_ACTIONS.PLAN_CHANGED,
    entityType: "subscription",
    entityId: organizationId,
    metadata: { to: planCode, by: "platform_admin" },
  });

  revalidatePath("/admin");
  revalidatePath("/settings");
  return { error: null };
}
