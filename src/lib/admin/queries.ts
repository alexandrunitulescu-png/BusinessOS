import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

export type AdminOrgRow = {
  id: string;
  legalName: string;
  tradeName: string | null;
  cui: string | null;
  createdAt: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  planCode: string | null;
  planName: string | null;
  subscriptionStatus: string | null;
};

/**
 * Every organization with its owner + current plan, for the platform-admin
 * screen. Relies on the `is_platform_admin()` RLS exception (migration
 * 20260827000008) — a normal user gets only their own orgs here.
 *
 * Three small reads merged in JS rather than one deeply-nested PostgREST select:
 * the loose client mis-infers nested embeds, and there are few orgs.
 */
export async function listAllOrganizations(supabase: Db, q?: string): Promise<AdminOrgRow[]> {
  const [{ data: orgs, error: orgErr }, { data: subs }, { data: owners }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, legal_name, trade_name, cui, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("organization_id, status, plan:plans(code, name)"),
    supabase
      .from("organization_users")
      .select("organization_id, role, status, profile:profiles(email, full_name)")
      .eq("role", "OWNER"),
  ]);
  if (orgErr) throw orgErr;

  const subByOrg = new Map<string, Row>();
  for (const s of (subs ?? []) as Row[]) subByOrg.set(s.organization_id as string, s);

  const ownerByOrg = new Map<string, Row>();
  for (const o of (owners ?? []) as Row[]) {
    // prefer an ACTIVE owner if several rows exist
    const existing = ownerByOrg.get(o.organization_id as string);
    if (!existing || o.status === "ACTIVE") ownerByOrg.set(o.organization_id as string, o);
  }

  const rows: AdminOrgRow[] = ((orgs ?? []) as Row[]).map((o) => {
    const sub = subByOrg.get(o.id as string) ?? {};
    const plan = one<Row>(sub.plan as Row | Row[] | null);
    const owner = ownerByOrg.get(o.id as string) ?? {};
    const profile = one<Row>(owner.profile as Row | Row[] | null);
    return {
      id: o.id as string,
      legalName: o.legal_name as string,
      tradeName: (o.trade_name as string) ?? null,
      cui: (o.cui as string) ?? null,
      createdAt: (o.created_at as string) ?? null,
      ownerEmail: (profile?.email as string) ?? null,
      ownerName: (profile?.full_name as string) ?? null,
      planCode: (plan?.code as string) ?? null,
      planName: (plan?.name as string) ?? null,
      subscriptionStatus: (sub.status as string) ?? null,
    };
  });

  const term = q?.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((r) =>
    [r.legalName, r.tradeName, r.cui, r.ownerEmail, r.ownerName]
      .filter(Boolean)
      .some((v) => (v as string).toLowerCase().includes(term)),
  );
}
