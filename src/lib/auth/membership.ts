import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getUserMemberships } from "@/lib/organizations/queries";
import { ACTIVE_ORG_COOKIE } from "@/lib/organizations/constants";
import type { OrganizationMembership } from "@/lib/organizations/types";

/**
 * Resolves the caller's active organization membership. The active-org cookie is
 * only a hint — memberships come from the database (through RLS) every call, so a
 * stale or forged cookie can't select an org the user isn't in.
 *
 * Returns `null` when the user has no organizations. No `server-only` import
 * here so that `"use server"` action files can reuse it without dragging the
 * server-only poison into their client-facing reference (see lib/auth/session.ts
 * for the page-level wrappers that add redirects).
 */
export async function resolveActiveMembership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<{ membership: OrganizationMembership; memberships: OrganizationMembership[] } | null> {
  const memberships = await getUserMemberships(supabase);
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const membership = memberships.find((m) => m.id === activeId) ?? memberships[0];

  return { membership, memberships };
}

type ActionContext =
  | {
      ok: true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: SupabaseClient<any>;
      membership: OrganizationMembership;
    }
  | { ok: false; error: string };

/**
 * Auth + active-membership context for a Server Action. Returns `{ ok: false,
 * error }` on failure instead of redirecting, so actions can surface it in their
 * `{ error }` result. Page loads use `requireActiveMembership()` from
 * lib/auth/session.ts instead (which redirects).
 */
export async function getActionContext(): Promise<ActionContext> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { ok: false, error: "Sesiune expirată. Autentifică-te din nou." };
  }

  const resolved = await resolveActiveMembership(supabase);
  if (!resolved) return { ok: false, error: "Nu ai nicio organizație activă." };

  return { ok: true, supabase, membership: resolved.membership };
}
