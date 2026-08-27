"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionContext } from "@/lib/auth/membership";
import { hasPermission, type Action } from "@/lib/auth/rbac";
import { projectSchema, type ProjectInput } from "@/lib/projects/schemas";

export type MutationResult = { error: string | null };

const NO_PERMISSION = "Nu ai permisiunea să faci această modificare.";

/**
 * postgrest-js@2.112.4 mis-infers insert/update payloads as `never` against the
 * hand-written Database type — see lib/organizations/mutations.ts.
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
  if (!hasPermission(ctx.membership.role, "business", action)) {
    return { ok: false, error: NO_PERMISSION };
  }
  return { ok: true, supabase: loose(ctx.supabase), organizationId: ctx.membership.id };
}

function projectColumns(data: ProjectInput) {
  const hasBudget = typeof data.budget === "number";
  return {
    name: data.name,
    client_id: data.clientId || null,
    description: data.description || null,
    status: data.status,
    start_date: data.startDate || null,
    deadline: data.deadline || null,
    budget: hasBudget ? data.budget : null,
    currency: hasBudget ? data.currency : null,
  };
}

export async function createProjectAction(input: ProjectInput): Promise<MutationResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("projects")
    .insert({ ...projectColumns(parsed.data), organization_id: gate.organizationId });
  if (error) return { error: error.message };

  revalidatePath("/projects");
  redirect("/projects");
}

export async function updateProjectAction(
  id: string,
  input: ProjectInput,
): Promise<MutationResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("projects")
    .update(projectColumns(parsed.data))
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect("/projects");
}

export async function deleteProjectAction(id: string): Promise<MutationResult> {
  const gate = await authorize("delete");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("projects")
    .delete()
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/projects");
  redirect("/projects");
}
