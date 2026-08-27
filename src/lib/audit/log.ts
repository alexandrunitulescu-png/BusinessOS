import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditAction } from "@/lib/audit/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

export type AuditEntry = {
  organizationId: string;
  userId: string | null;
  action: AuditAction;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Appends one row to `audit_logs` using the caller's user-scoped client — the
 * RLS `audit_logs_insert` policy already allows `is_org_member(org) and user_id
 * = auth.uid()`. The table is append-only (no UPDATE/DELETE grant, see migration
 * 20260827000006).
 *
 * Best-effort by design: a failed audit write is logged but never thrown, so it
 * cannot turn a successful business action into a user-visible error. Call it
 * after the mutation has succeeded and before any `redirect()`.
 */
export async function writeAudit(supabase: Db, entry: AuditEntry): Promise<void> {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      organization_id: entry.organizationId,
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
    });
    if (error) throw error;
  } catch (err) {
    console.error(`[audit] failed to record ${entry.action}:`, err);
  }
}
