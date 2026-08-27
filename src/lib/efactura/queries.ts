import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const EFACTURA_PROVIDER = "ANAF_EFACTURA";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

export type TaxIntegration = {
  provider: string;
  status: "NOT_CONNECTED" | "PENDING" | "CONNECTED" | "EXPIRED" | "REVOKED";
  connectedAt: string | null;
  expiresAt: string | null;
};

export type EInvoiceSubmission = {
  id: string;
  provider: string;
  uploadId: string | null;
  status:
    | "NOT_REQUIRED"
    | "NOT_SENT"
    | "QUEUED"
    | "SUBMITTED"
    | "PROCESSING"
    | "VALIDATED"
    | "REJECTED";
  submittedAt: string | null;
  lastCheckedAt: string | null;
  validatedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  updatedAt: string;
};

export type EInvoiceEvent = {
  id: string;
  eventType: string;
  statusBefore: string | null;
  statusAfter: string | null;
  occurredAt: string;
};

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

export async function getTaxIntegration(
  supabase: Db,
  organizationId: string,
): Promise<TaxIntegration | null> {
  const { data, error } = await supabase
    .from("tax_integrations")
    .select("provider, status, connected_at, expires_at")
    .eq("organization_id", organizationId)
    .eq("provider", EFACTURA_PROVIDER)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    provider: data.provider,
    status: data.status,
    connectedAt: str(data.connected_at),
    expiresAt: str(data.expires_at),
  };
}

export async function getLatestSubmission(
  supabase: Db,
  organizationId: string,
  invoiceId: string,
): Promise<EInvoiceSubmission | null> {
  const { data, error } = await supabase
    .from("einvoice_submissions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    provider: data.provider,
    uploadId: str(data.upload_id),
    status: data.status,
    submittedAt: str(data.submitted_at),
    lastCheckedAt: str(data.last_checked_at),
    validatedAt: str(data.validated_at),
    errorCode: str(data.error_code),
    errorMessage: str(data.error_message),
    updatedAt: data.updated_at,
  };
}

export async function getSubmissionEvents(
  supabase: Db,
  submissionId: string,
): Promise<EInvoiceEvent[]> {
  const { data, error } = await supabase
    .from("einvoice_submission_events")
    .select("id, event_type, status_before, status_after, occurred_at")
    .eq("submission_id", submissionId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({
    id: row.id as string,
    eventType: row.event_type as string,
    statusBefore: str(row.status_before),
    statusAfter: str(row.status_after),
    occurredAt: row.occurred_at as string,
  }));
}
