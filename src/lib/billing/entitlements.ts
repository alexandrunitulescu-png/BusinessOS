import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/billing/constants";
import type { Entitlements, PlanInfo, QuotaCheck } from "@/lib/billing/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

function numOrNull(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function featureMap(source: Record<string, unknown> | null | undefined): Record<FeatureKey, boolean> {
  const out = {} as Record<FeatureKey, boolean>;
  for (const key of FEATURE_KEYS) {
    out[key] = source?.[key] === true;
  }
  return out;
}

function mapPlan(row: Row): PlanInfo {
  const limits = (row.limits ?? {}) as Record<string, unknown>;
  return {
    code: row.code as PlanInfo["code"],
    name: (row.name as string) ?? String(row.code),
    price: numOrNull(row.price),
    currency: (row.currency as string) ?? "RON",
    limits: {
      users: numOrNull(limits.users),
      invoices_per_month: numOrNull(limits.invoices_per_month),
      storage_mb: numOrNull(limits.storage_mb),
    },
    features: featureMap((row.features ?? {}) as Record<string, unknown>),
  };
}

/**
 * The single source of truth for what an organization can do (M0 §12). Resolves
 * the current plan through the subscription, then layers per-org feature_flags
 * overrides on top of the plan's feature defaults.
 */
export async function getEntitlements(
  supabase: Db,
  organizationId: string,
): Promise<Entitlements | null> {
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select(
      "status, trial_ends_at, current_period_end, plan:plans(code, name, price, currency, limits, features)",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!sub || !sub.plan) return null;

  // The join is a to-one FK; the loose client sometimes infers it as an array.
  const planRow = (Array.isArray(sub.plan) ? sub.plan[0] : sub.plan) as unknown as Row;
  if (!planRow) return null;
  const plan = mapPlan(planRow);

  const { data: flags } = await supabase
    .from("feature_flags")
    .select("feature_key, enabled")
    .eq("organization_id", organizationId);

  const features = { ...plan.features };
  for (const flag of (flags ?? []) as Row[]) {
    const key = flag.feature_key as FeatureKey;
    if (FEATURE_KEYS.includes(key)) features[key] = flag.enabled === true;
  }

  return {
    plan,
    subscription: {
      status: sub.status as Entitlements["subscription"]["status"],
      trialEndsAt: str(sub.trial_ends_at),
      currentPeriodEnd: str(sub.current_period_end),
    },
    features,
  };
}

export function canUseFeature(entitlements: Entitlements | null, key: FeatureKey): boolean {
  return entitlements?.features[key] ?? false;
}

/** Reads the metered usage for the current calendar month. */
export async function getMonthlyUsage(
  supabase: Db,
  organizationId: string,
  metric: string,
): Promise<number> {
  const start = new Date();
  const periodStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("usage_tracking")
    .select("value")
    .eq("organization_id", organizationId)
    .eq("metric", metric)
    .eq("period_start", periodStart)
    .maybeSingle();
  if (error) throw error;
  return data ? Number(data.value ?? 0) : 0;
}

/** Whether the org can create another invoice this month under its plan. */
export async function checkInvoiceQuota(
  supabase: Db,
  organizationId: string,
  entitlements: Entitlements,
): Promise<QuotaCheck> {
  const limit = entitlements.plan.limits.invoices_per_month;
  const used = await getMonthlyUsage(supabase, organizationId, "invoices_created");
  if (limit === null || limit <= 0) {
    return { allowed: true, used, limit: null, remaining: null };
  }
  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(limit - used, 0),
  };
}

/** Active-user count for the org (cheap — small tables). */
export async function getActiveUserCount(
  supabase: Db,
  organizationId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("organization_users")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE");
  if (error) throw error;
  return count ?? 0;
}

/** Total stored bytes across the org's documents. */
export async function getStorageBytes(
  supabase: Db,
  organizationId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("documents")
    .select("size_bytes")
    .eq("organization_id", organizationId);
  if (error) throw error;
  return (data ?? []).reduce((sum: number, r: Row) => sum + Number(r.size_bytes ?? 0), 0);
}
