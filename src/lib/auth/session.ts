import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveMembership } from "@/lib/auth/membership";
import { hasPermission, type Action, type Resource } from "@/lib/auth/rbac";
import { canUseFeature, getEntitlements } from "@/lib/billing/entitlements";
import type { FeatureKey } from "@/lib/billing/constants";

/**
 * Authenticates via `getUser()` (not `getSession()`) so the token is
 * revalidated against Supabase rather than trusted from local cookie claims.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
}

/**
 * Resolves which organization the current request is acting on. The active-org
 * cookie is only ever a hint — membership is re-checked against the database
 * (through RLS) on every call, so a stale or forged cookie value can't grant
 * access to an organization the user isn't actually in.
 */
export async function requireActiveMembership() {
  const { supabase, user } = await requireUser();
  const resolved = await resolveActiveMembership(supabase);

  if (!resolved) redirect("/onboarding");

  return { supabase, user, ...resolved };
}

/**
 * Page-level RBAC gate. The sidebar already hides sections a role can't reach,
 * but this stops a hand-typed URL — the authoritative app-layer check that sits
 * in front of RLS (M0 §8). Sends unauthorized users back to the dashboard.
 *
 * Pass `feature` to also require that the org's plan includes it (M0 §12);
 * feature-gated routes send the user to /settings to upgrade.
 */
export async function requirePageAccess(
  resource: Resource,
  action: Action = "read",
  feature?: FeatureKey,
) {
  const context = await requireActiveMembership();
  if (!hasPermission(context.membership.role, resource, action)) {
    redirect("/dashboard");
  }
  if (feature) {
    const entitlements = await getEntitlements(context.supabase, context.membership.id);
    if (!canUseFeature(entitlements, feature)) {
      redirect(`/settings?feature=${feature}`);
    }
  }
  return context;
}
