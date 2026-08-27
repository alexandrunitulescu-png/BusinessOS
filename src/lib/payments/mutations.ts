"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionContext } from "@/lib/auth/membership";
import { hasPermission, type Action } from "@/lib/auth/rbac";
import { paymentSchema, type PaymentInput } from "@/lib/payments/schemas";

export type MutationResult = { error: string | null };

const NO_PERMISSION = "Nu ai permisiunea să faci această modificare.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (db: unknown) => db as SupabaseClient<any>;

type Gate =
  | { ok: false; error: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { ok: true; supabase: SupabaseClient<any>; organizationId: string };

async function authorize(action: Action): Promise<Gate> {
  const ctx = await getActionContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!hasPermission(ctx.membership.role, "money", action)) {
    return { ok: false, error: NO_PERMISSION };
  }
  return { ok: true, supabase: loose(ctx.supabase), organizationId: ctx.membership.id };
}

export async function createPaymentAction(input: PaymentInput): Promise<MutationResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };
  const data = parsed.data;

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const isInvoice = data.targetType === "INVOICE";

  if (isInvoice) {
    const { data: inv, error: invErr } = await gate.supabase
      .from("invoices")
      .select("id, status")
      .eq("organization_id", gate.organizationId)
      .eq("id", data.targetId)
      .maybeSingle();
    if (invErr) return { error: invErr.message };
    if (!inv) return { error: "Factura nu există." };
    if (inv.status === "DRAFT") {
      return { error: "Emite factura înainte de a înregistra o încasare." };
    }
    if (inv.status === "CANCELLED") return { error: "Factura este anulată." };
  } else {
    const { data: exp, error: expErr } = await gate.supabase
      .from("expenses")
      .select("id")
      .eq("organization_id", gate.organizationId)
      .eq("id", data.targetId)
      .maybeSingle();
    if (expErr) return { error: expErr.message };
    if (!exp) return { error: "Cheltuiala nu există." };
  }

  const { error } = await gate.supabase.from("payments").insert({
    organization_id: gate.organizationId,
    invoice_id: isInvoice ? data.targetId : null,
    expense_id: isInvoice ? null : data.targetId,
    amount: data.amount,
    currency: data.currency,
    payment_date: data.paymentDate,
    payment_method: data.paymentMethod,
    reference: data.reference || null,
    notes: data.notes || null,
  });
  if (error) return { error: error.message };

  const backHref = isInvoice ? `/invoices/${data.targetId}` : `/expenses/${data.targetId}`;
  revalidatePath("/payments");
  revalidatePath(backHref);
  revalidatePath("/dashboard");
  redirect(backHref);
}

export async function deletePaymentAction(id: string): Promise<MutationResult> {
  const gate = await authorize("delete");
  if (!gate.ok) return { error: gate.error };

  const { data: payment } = await gate.supabase
    .from("payments")
    .select("invoice_id, expense_id")
    .eq("organization_id", gate.organizationId)
    .eq("id", id)
    .maybeSingle();

  const { error } = await gate.supabase
    .from("payments")
    .delete()
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  const backHref = payment?.invoice_id
    ? `/invoices/${payment.invoice_id}`
    : payment?.expense_id
      ? `/expenses/${payment.expense_id}`
      : "/payments";
  revalidatePath("/payments");
  revalidatePath(backHref);
  revalidatePath("/dashboard");
  redirect(backHref);
}
