"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionContext } from "@/lib/auth/membership";
import { hasPermission, type Action } from "@/lib/auth/rbac";
import {
  invoiceDraftSchema,
  MANUAL_STATUS_TRANSITIONS,
  type InvoiceDraftInput,
  type InvoiceStatus,
} from "@/lib/invoicing/schemas";
import { computeInvoice } from "@/lib/invoicing/calculations";
import { checkInvoiceQuota, getEntitlements } from "@/lib/billing/entitlements";

export type MutationResult = { error: string | null };
export type CreateResult = { error: string | null; id?: string };

const NO_PERMISSION = "Nu ai permisiunea să faci această modificare.";
const NOT_DRAFT = "Doar facturile în ciornă pot fi modificate.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (db: unknown) => db as SupabaseClient<any>;

type Gate =
  | { ok: false; error: string }
  | {
      ok: true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: SupabaseClient<any>;
      organizationId: string;
      userId: string;
    };

async function authorize(action: Action): Promise<Gate> {
  const ctx = await getActionContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!hasPermission(ctx.membership.role, "money", action)) {
    return { ok: false, error: NO_PERMISSION };
  }
  return {
    ok: true,
    supabase: loose(ctx.supabase),
    organizationId: ctx.membership.id,
    userId: ctx.userId,
  };
}

/** Computes totals and shapes both the invoice money columns and the line rows. */
function buildInvoicePayload(input: InvoiceDraftInput) {
  const totals = computeInvoice(
    input.lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      vatRate: l.vatRate,
      discountPercent: l.discountPercent,
    })),
  );

  const header = {
    client_id: input.clientId,
    project_id: input.projectId || null,
    series_id: input.seriesId,
    issue_date: input.issueDate,
    due_date: input.dueDate || null,
    currency: input.currency,
    exchange_rate: typeof input.exchangeRate === "number" ? input.exchangeRate : null,
    payment_terms: input.paymentTerms || null,
    notes: input.notes || null,
    subtotal: totals.subtotal,
    vat_total: totals.vatTotal,
    total: totals.total,
  };

  const lines = input.lines.map((l, i) => ({
    product_service_id: l.productServiceId || null,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unit_price: l.unitPrice,
    vat_rate: l.vatRate,
    discount_percent: l.discountPercent,
    line_total: totals.lines[i].lineNet,
    sort_order: i,
  }));

  return { header, lines };
}

export async function createInvoiceAction(input: InvoiceDraftInput): Promise<CreateResult> {
  const parsed = invoiceDraftSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const entitlements = await getEntitlements(gate.supabase, gate.organizationId);
  if (entitlements) {
    const quota = await checkInvoiceQuota(gate.supabase, gate.organizationId, entitlements);
    if (!quota.allowed) {
      return {
        error: `Ai atins limita de ${quota.limit} facturi pe lună (plan ${entitlements.plan.name}). Fă upgrade din Setări.`,
      };
    }
  }

  const { header, lines } = buildInvoicePayload(parsed.data);

  const { data: created, error } = await gate.supabase
    .from("invoices")
    .insert({
      ...header,
      organization_id: gate.organizationId,
      status: "DRAFT",
      created_by: gate.userId,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Nu am putut crea factura." };

  const { error: lineErr } = await gate.supabase
    .from("invoice_lines")
    .insert(lines.map((l) => ({ ...l, invoice_id: created.id })));
  if (lineErr) {
    await gate.supabase.from("invoices").delete().eq("id", created.id);
    return { error: lineErr.message };
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${created.id}`);
}

export async function updateInvoiceAction(
  id: string,
  input: InvoiceDraftInput,
): Promise<MutationResult> {
  const parsed = invoiceDraftSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { data: current, error: readErr } = await gate.supabase
    .from("invoices")
    .select("status")
    .eq("organization_id", gate.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!current) return { error: "Factura nu există." };
  if (current.status !== "DRAFT") return { error: NOT_DRAFT };

  const { header, lines } = buildInvoicePayload(parsed.data);

  const { error } = await gate.supabase
    .from("invoices")
    .update(header)
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  // Lines are rewritten wholesale — safe while DRAFT, and the RLS policy only
  // permits line writes on DRAFT invoices anyway.
  const { error: delErr } = await gate.supabase
    .from("invoice_lines")
    .delete()
    .eq("invoice_id", id);
  if (delErr) return { error: delErr.message };

  const { error: insErr } = await gate.supabase
    .from("invoice_lines")
    .insert(lines.map((l) => ({ ...l, invoice_id: id })));
  if (insErr) return { error: insErr.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function deleteInvoiceAction(id: string): Promise<MutationResult> {
  const gate = await authorize("delete");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("invoices")
    .delete()
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function issueInvoiceAction(id: string): Promise<MutationResult> {
  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase.rpc("issue_invoice", { p_invoice_id: id } as never);
  if (error) return { error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function setInvoiceStatusAction(
  id: string,
  status: InvoiceStatus,
): Promise<MutationResult> {
  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { data: current, error: readErr } = await gate.supabase
    .from("invoices")
    .select("status")
    .eq("organization_id", gate.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!current) return { error: "Factura nu există." };

  const allowed = MANUAL_STATUS_TRANSITIONS[current.status as InvoiceStatus] ?? [];
  if (!allowed.includes(status)) {
    return { error: "Această schimbare de status nu este permisă." };
  }

  const { error } = await gate.supabase
    .from("invoices")
    .update({ status })
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}
