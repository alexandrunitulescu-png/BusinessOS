"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionContext } from "@/lib/auth/membership";
import { hasPermission, type Action } from "@/lib/auth/rbac";
import {
  clientSchema,
  supplierSchema,
  type ClientInput,
  type SupplierInput,
} from "@/lib/crm/schemas";

export type MutationResult = { error: string | null };

const NO_PERMISSION = "Nu ai permisiunea să faci această modificare.";

/**
 * postgrest-js@2.112.4 mis-infers insert/update payloads as `never` against the
 * hand-written (non-codegen) Database type — same bug worked around in
 * lib/organizations/mutations.ts. Drop once src/types/database.ts is generated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (db: unknown) => db as SupabaseClient<any>;

/** Auth + membership + RBAC gate shared by every mutation below. */
type Gate =
  | { ok: false; error: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { ok: true; supabase: SupabaseClient<any>; organizationId: string };

async function authorize(action: Action): Promise<Gate> {
  const ctx = await getActionContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!hasPermission(ctx.membership.role, "business", action)) {
    return { ok: false, error: NO_PERMISSION };
  }
  return { ok: true, supabase: loose(ctx.supabase), organizationId: ctx.membership.id };
}

function nullify<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = value === undefined || value === "" ? null : value;
  }
  return out as T;
}

/** Shared column payload for both clients and suppliers. */
function partyColumns(data: ClientInput | SupplierInput) {
  return nullify({
    type: data.type,
    company_name: "companyName" in data ? data.companyName : null,
    cui: data.cui,
    registration_number: data.registrationNumber,
    contact_person: data.contactPerson,
    email: data.email,
    phone: data.phone,
    address_line: data.addressLine,
    city: data.city,
    county: data.county,
    country: data.country || "RO",
    iban: data.iban,
    notes: data.notes,
    is_active: data.isActive,
  });
}

// ---------- Clients ----------

export async function createClientAction(input: ClientInput): Promise<MutationResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase.from("clients").insert({
    ...partyColumns(parsed.data),
    first_name: parsed.data.firstName ?? null,
    last_name: parsed.data.lastName ?? null,
    organization_id: gate.organizationId,
  });
  if (error) return { error: error.message };

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClientAction(
  id: string,
  input: ClientInput,
): Promise<MutationResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("clients")
    .update({
      ...partyColumns(parsed.data),
      first_name: parsed.data.firstName ?? null,
      last_name: parsed.data.lastName ?? null,
    })
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect("/clients");
}

export async function deleteClientAction(id: string): Promise<MutationResult> {
  const gate = await authorize("delete");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("clients")
    .delete()
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/clients");
  redirect("/clients");
}

// ---------- Suppliers ----------

export async function createSupplierAction(input: SupplierInput): Promise<MutationResult> {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase.from("suppliers").insert({
    ...partyColumns(parsed.data),
    organization_id: gate.organizationId,
  });
  if (error) return { error: error.message };

  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function updateSupplierAction(
  id: string,
  input: SupplierInput,
): Promise<MutationResult> {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("suppliers")
    .update(partyColumns(parsed.data))
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  redirect("/suppliers");
}

export async function deleteSupplierAction(id: string): Promise<MutationResult> {
  const gate = await authorize("delete");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("suppliers")
    .delete()
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/suppliers");
  redirect("/suppliers");
}
