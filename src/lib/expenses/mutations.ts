"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionContext } from "@/lib/auth/membership";
import { hasPermission, type Action } from "@/lib/auth/rbac";
import { expenseSchema, type ExpenseInput } from "@/lib/expenses/schemas";
import { writeAudit } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export type MutationResult = { error: string | null };

const NO_PERMISSION = "Nu ai permisiunea să faci această modificare.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (db: unknown) => db as SupabaseClient<any>;

type Gate =
  | { ok: false; error: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { ok: true; supabase: SupabaseClient<any>; organizationId: string; userId: string };

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

function expenseColumns(data: ExpenseInput) {
  return {
    supplier_id: data.supplierId || null,
    project_id: data.projectId || null,
    expense_date: data.expenseDate,
    category: data.category || null,
    description: data.description || null,
    amount: data.amount,
    vat_amount: data.vatAmount,
    currency: data.currency,
  };
}

export async function createExpenseAction(input: ExpenseInput): Promise<MutationResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("expenses")
    .insert({ ...expenseColumns(parsed.data), organization_id: gate.organizationId });
  if (error) return { error: error.message };

  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function updateExpenseAction(
  id: string,
  input: ExpenseInput,
): Promise<MutationResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("expenses")
    .update(expenseColumns(parsed.data))
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  // If the amount changed, the `expenses_reconcile` trigger has already
  // refreshed payment_status against the existing payments.
  revalidatePath("/expenses");
  revalidatePath(`/expenses/${id}`);
  redirect("/expenses");
}

export async function deleteExpenseAction(id: string): Promise<MutationResult> {
  const gate = await authorize("delete");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("expenses")
    .delete()
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  await writeAudit(gate.supabase, {
    organizationId: gate.organizationId,
    userId: gate.userId,
    action: AUDIT_ACTIONS.EXPENSE_DELETED,
    entityType: "expense",
    entityId: id,
  });

  revalidatePath("/expenses");
  redirect("/expenses");
}
