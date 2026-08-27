import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

export type RateLimitRule = { limit: number; windowSeconds: number };

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * Named limiter rules. Keep the buckets here so every call site is consistent
 * and the numbers are reviewable in one place (M0 §14/§812).
 */
export const RATE_LIMITS = {
  // Brute-force protection on credential endpoints.
  "auth:signin": { limit: 5, windowSeconds: 300 },
  "auth:signup": { limit: 3, windowSeconds: 3600 },
  // Coarse per-IP ceiling applied in the proxy for auth routes.
  "auth:ip": { limit: 30, windowSeconds: 60 },
  // e-Factura prepare / submit — per organization.
  "efactura:prepare": { limit: 30, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

/**
 * Fixed-window rate limit backed by the `check_rate_limit` Postgres function
 * (serverless-safe — see migration 20260827000007). Registers one hit and
 * returns whether the caller is still under the limit.
 *
 * Fails **open**: a limiter/DB error is logged and treated as allowed, so an
 * outage throttling everyone out of login is never the failure mode.
 */
export async function checkRateLimit(
  supabase: Db,
  bucket: RateLimitBucket,
  identifier: string,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[bucket];
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_bucket: bucket,
      p_identifier: identifier,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { allowed: true, retryAfterSeconds: 0 };
    return {
      allowed: row.allowed === true,
      retryAfterSeconds: Number(row.retry_after ?? 0),
    };
  } catch (err) {
    console.error(`[rate-limit] ${bucket} check failed, allowing:`, err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** Human-friendly Romanian throttle message. */
export function rateLimitMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  if (minutes <= 1) return "Prea multe încercări. Reîncearcă într-un minut.";
  return `Prea multe încercări. Reîncearcă în ~${minutes} minute.`;
}
