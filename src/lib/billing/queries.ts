import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanInfo } from "@/lib/billing/types";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/billing/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

function numOrNull(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function features(source: Record<string, unknown>): Record<FeatureKey, boolean> {
  const out = {} as Record<FeatureKey, boolean>;
  for (const key of FEATURE_KEYS) out[key] = source?.[key] === true;
  return out;
}

/** The full plan catalog, cheapest first, for the plan comparison. */
export async function listPlans(supabase: Db): Promise<PlanInfo[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("code, name, price, currency, limits, features")
    .order("price", { ascending: true, nullsFirst: true });
  if (error) throw error;

  return (data ?? []).map((row: Row) => {
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
      features: features((row.features ?? {}) as Record<string, unknown>),
    };
  });
}
