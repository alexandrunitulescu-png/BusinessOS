import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Whether the current user is platform staff (`profiles.is_platform_admin`).
 * Platform admins get a narrow cross-tenant exception — they can list every
 * organization and change any org's plan, but cannot read tenant business data
 * (see migration 20260827000008).
 *
 * No `server-only` import here so `"use server"` action files can call it
 * without dragging the poison into their client-facing reference (same reason
 * as lib/auth/membership.ts).
 */
export async function isPlatformAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) {
    console.error("[platform] is_platform_admin check failed:", error);
    return false;
  }
  return data === true;
}
