import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate-limit keys. Behind Vercel / a reverse proxy the
 * real client is the first entry of `x-forwarded-for`; `x-real-ip` is the
 * fallback. Never trust this for authorization — it is spoofable when the app is
 * reached directly — but it is the right granularity for throttling.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}
