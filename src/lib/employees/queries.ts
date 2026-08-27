import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContractType, EmployeeStatus } from "@/lib/employees/schemas";
import type { Employee, EmployeeListItem } from "@/lib/employees/types";

export const PAGE_SIZE = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

function likeTerm(search: string): string {
  return `%${search.replace(/[,()*%\\]/g, " ").trim()}%`;
}

/** Columns that are safe to show in a list — deliberately excludes cnp/salary/iban. */
const LIST_COLUMNS = "id, first_name, last_name, job_title, department, contract_type, status, hire_date";

function mapListItem(row: Row): EmployeeListItem {
  return {
    id: row.id as string,
    firstName: (row.first_name as string) ?? "",
    lastName: (row.last_name as string) ?? "",
    jobTitle: str(row.job_title),
    department: str(row.department),
    contractType: (row.contract_type as ContractType) ?? null,
    status: (row.status as EmployeeStatus) ?? "ACTIVE",
    hireDate: str(row.hire_date),
  };
}

function mapEmployee(row: Row): Employee {
  return {
    id: row.id as string,
    firstName: (row.first_name as string) ?? "",
    lastName: (row.last_name as string) ?? "",
    email: str(row.email),
    phone: str(row.phone),
    jobTitle: str(row.job_title),
    department: str(row.department),
    status: (row.status as EmployeeStatus) ?? "ACTIVE",
    hireDate: str(row.hire_date),
    cnp: str(row.cnp),
    contractType: (row.contract_type as ContractType) ?? null,
    contractStartDate: str(row.contract_start_date),
    contractEndDate: str(row.contract_end_date),
    baseSalary: num(row.base_salary),
    salaryCurrency: str(row.salary_currency),
    iban: str(row.iban),
    notes: str(row.notes),
  };
}

export async function listEmployees(
  supabase: Db,
  organizationId: string,
  { search, page = 1, status }: { search?: string; page?: number; status?: EmployeeStatus } = {},
) {
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from("employees")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status) query = query.eq("status", status);

  const term = search?.trim();
  if (term) {
    const t = likeTerm(term);
    query = query.or(
      `first_name.ilike.${t},last_name.ilike.${t},job_title.ilike.${t},department.ilike.${t}`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { employees: (data ?? []).map(mapListItem), total: count ?? 0 };
}

export async function getEmployee(
  supabase: Db,
  organizationId: string,
  id: string,
): Promise<Employee | null> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapEmployee(data) : null;
}
