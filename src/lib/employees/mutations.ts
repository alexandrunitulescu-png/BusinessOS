"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionContext } from "@/lib/auth/membership";
import { hasPermission, type Action } from "@/lib/auth/rbac";
import { employeeSchema, type EmployeeInput } from "@/lib/employees/schemas";
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
  if (!hasPermission(ctx.membership.role, "employees", action)) {
    return { ok: false, error: NO_PERMISSION };
  }
  return {
    ok: true,
    supabase: loose(ctx.supabase),
    organizationId: ctx.membership.id,
    userId: ctx.userId,
  };
}

function employeeColumns(data: EmployeeInput) {
  const hasSalary = typeof data.baseSalary === "number";
  return {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email || null,
    phone: data.phone || null,
    job_title: data.jobTitle || null,
    department: data.department || null,
    status: data.status,
    hire_date: data.hireDate || null,
    cnp: data.cnp || null,
    contract_type: data.contractType || null,
    contract_start_date: data.contractStartDate || null,
    contract_end_date: data.contractEndDate || null,
    base_salary: hasSalary ? data.baseSalary : null,
    salary_currency: hasSalary ? data.salaryCurrency : "RON",
    iban: data.iban || null,
    notes: data.notes || null,
  };
}

export async function createEmployeeAction(input: EmployeeInput): Promise<MutationResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { data: created, error } = await gate.supabase
    .from("employees")
    .insert({ ...employeeColumns(parsed.data), organization_id: gate.organizationId })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Nu am putut adăuga angajatul." };

  // Metadata stays minimal on purpose: audit_logs is readable by any org member,
  // but the employees table is OWNER/ADMIN-only. No name / CNP / salary here.
  await writeAudit(gate.supabase, {
    organizationId: gate.organizationId,
    userId: gate.userId,
    action: AUDIT_ACTIONS.EMPLOYEE_CREATED,
    entityType: "employee",
    entityId: created.id,
  });

  revalidatePath("/employees");
  redirect("/employees");
}

export async function updateEmployeeAction(
  id: string,
  input: EmployeeInput,
): Promise<MutationResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("employees")
    .update(employeeColumns(parsed.data))
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  await writeAudit(gate.supabase, {
    organizationId: gate.organizationId,
    userId: gate.userId,
    action: AUDIT_ACTIONS.EMPLOYEE_UPDATED,
    entityType: "employee",
    entityId: id,
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  redirect("/employees");
}

export async function deleteEmployeeAction(id: string): Promise<MutationResult> {
  const gate = await authorize("delete");
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("employees")
    .delete()
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  await writeAudit(gate.supabase, {
    organizationId: gate.organizationId,
    userId: gate.userId,
    action: AUDIT_ACTIONS.EMPLOYEE_DELETED,
    entityType: "employee",
    entityId: id,
  });

  revalidatePath("/employees");
  redirect("/employees");
}
