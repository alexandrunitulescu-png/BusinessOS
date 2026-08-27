import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserMemberships } from "@/lib/organizations/queries";
import { ACTIVE_ORG_COOKIE } from "@/lib/organizations/constants";
import { hasPermission, type Action, type Resource } from "@/lib/auth/rbac";

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
  const memberships = await getUserMemberships(supabase);

  if (memberships.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const membership = memberships.find((m) => m.id === activeId) ?? memberships[0];

  return { supabase, user, membership, memberships };
}

/**
 * Page-level RBAC gate. The sidebar already hides sections a role can't reach,
 * but this stops a hand-typed URL — the authoritative app-layer check that sits
 * in front of RLS (M0 §8). Sends unauthorized users back to the dashboard.
 */
export async function requirePageAccess(resource: Resource, action: Action = "read") {
  const context = await requireActiveMembership();
  if (!hasPermission(context.membership.role, resource, action)) {
    redirect("/dashboard");
  }
  return context;
}
