"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionContext } from "@/lib/auth/membership";
import { hasPermission } from "@/lib/auth/rbac";
import { prepareEInvoice } from "@/lib/efactura/prepare";
import { EFACTURA_PROVIDER } from "@/lib/efactura/queries";

export type MutationResult = { error: string | null };

const NO_PERMISSION = "Nu ai permisiunea să faci această modificare.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (db: unknown) => db as SupabaseClient<any>;

async function authorize() {
  const ctx = await getActionContext();
  if (!ctx.ok) return { ok: false as const, error: ctx.error };
  if (!hasPermission(ctx.membership.role, "money", "write")) {
    return { ok: false as const, error: NO_PERMISSION };
  }
  return { ok: true as const, supabase: loose(ctx.supabase), organizationId: ctx.membership.id };
}

/**
 * Country-neutral "prepare": validates the invoice for e-invoicing and, if it
 * passes, records an einvoice_submissions row at status NOT_SENT plus an audit
 * event, and flips invoices.einvoice_status. The actual transmission to ANAF is
 * a separate step, built once the official API docs are available.
 */
export async function prepareEInvoiceAction(invoiceId: string): Promise<MutationResult> {
  const gate = await authorize();
  if (!gate.ok) return { error: gate.error };

  const prepared = await prepareEInvoice(gate.supabase, gate.organizationId, invoiceId);
  if (!prepared.ok) return { error: prepared.error };
  if (!prepared.validation.valid) {
    return { error: "Factura nu trece validarea pentru e-Factura. Vezi lista de mai jos." };
  }

  const { data: existing } = await gate.supabase
    .from("einvoice_submissions")
    .select("id, status")
    .eq("organization_id", gate.organizationId)
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let submissionId = existing?.id as string | undefined;

  if (!submissionId) {
    const { data: created, error } = await gate.supabase
      .from("einvoice_submissions")
      .insert({
        organization_id: gate.organizationId,
        invoice_id: invoiceId,
        provider: EFACTURA_PROVIDER,
        status: "NOT_SENT",
      })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "Nu am putut pregăti e-Factura." };
    submissionId = created.id;
  } else if (existing?.status !== "NOT_SENT") {
    await gate.supabase
      .from("einvoice_submissions")
      .update({ status: "NOT_SENT", error_code: null, error_message: null })
      .eq("id", submissionId);
  }

  await gate.supabase.from("einvoice_submission_events").insert({
    submission_id: submissionId,
    event_type: "PREPARED",
    status_after: "NOT_SENT",
    payload: { note: "Validat local, XML UBL generat. Trimiterea la ANAF nu e configurată." },
  });

  await gate.supabase
    .from("invoices")
    .update({ einvoice_status: "NOT_SENT" })
    .eq("organization_id", gate.organizationId)
    .eq("id", invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  return { error: null };
}

/** Marks an invoice as not needing e-Factura and clears any NOT_SENT submission. */
export async function resetEInvoiceAction(invoiceId: string): Promise<MutationResult> {
  const gate = await authorize();
  if (!gate.ok) return { error: gate.error };

  await gate.supabase
    .from("einvoice_submissions")
    .delete()
    .eq("organization_id", gate.organizationId)
    .eq("invoice_id", invoiceId)
    .eq("status", "NOT_SENT");

  await gate.supabase
    .from("invoices")
    .update({ einvoice_status: "NOT_REQUIRED" })
    .eq("organization_id", gate.organizationId)
    .eq("id", invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  return { error: null };
}
