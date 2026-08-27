"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionContext } from "@/lib/auth/membership";
import { hasPermission, type Action } from "@/lib/auth/rbac";
import { itemSchema, type ItemInput } from "@/lib/catalog/schemas";

export type MutationResult = { error: string | null };

const NO_PERMISSION = "Nu ai permisiunea să faci această modificare.";

/**
 * postgrest-js@2.112.4 mis-infers insert/update payloads as `never` against the
 * hand-written Database type — see lib/organizations/mutations.ts. Drop once
 * src/types/database.ts is generated from the real schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (db: unknown) => db as SupabaseClient<any>;

type Gate =
  | { ok: false; error: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { ok: true; supabase: SupabaseClient<any>; organizationId: string };

async function authorize(action: Action): Promise<Gate> {
  const ctx = await getActionContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!hasPermission(ctx.membership.role, "catalog", action)) {
    return { ok: false, error: NO_PERMISSION };
  }
  return { ok: true, supabase: loose(ctx.supabase), organizationId: ctx.membership.id };
}

function itemColumns(data: ItemInput) {
  return {
    type: data.type,
    name: data.name,
    description: data.description || null,
    sku: data.sku || null,
    unit: data.unit || "buc",
    price: data.price,
    currency: data.currency,
    vat_rate: data.vatRate,
    is_active: data.isActive,
  };
}

export async function createItemAction(input: ItemInput): Promise<MutationResult> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("products_services")
    .insert({ ...itemColumns(parsed.data), organization_id: gate.organizationId });
  if (error) return { error: error.message };

  revalidatePath("/catalog");
  redirect("/catalog");
}

export async function updateItemAction(id: string, input: ItemInput): Promise<MutationResult> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("products_services")
    .update(itemColumns(parsed.data))
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/catalog");
  revalidatePath(`/catalog/${id}`);
  redirect("/catalog");
}

export async function deleteItemAction(id: string): Promise<MutationResult> {
  const gate = await authorize("delete");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("products_services")
    .delete()
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/catalog");
  redirect("/catalog");
}
