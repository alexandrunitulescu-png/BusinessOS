import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentStatus } from "@/lib/expenses/schemas";
import type { Expense, ExpenseListItem } from "@/lib/expenses/types";

export const PAGE_SIZE = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

const num = (v: unknown): number => Number(v ?? 0);
const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

function supplierName(supplier: Row | null): string | null {
  if (!supplier) return null;
  return str(supplier.company_name) || str(supplier.contact_person) || "Furnizor";
}

function mapExpense(row: Row): Expense {
  return {
    id: row.id as string,
    supplierId: str(row.supplier_id),
    projectId: str(row.project_id),
    expenseDate: row.expense_date as string,
    category: str(row.category),
    description: str(row.description),
    amount: num(row.amount),
    vatAmount: num(row.vat_amount),
    currency: (row.currency as string) ?? "RON",
    paymentStatus: (row.payment_status as PaymentStatus) ?? "UNPAID",
  };
}

const likeTerm = (s: string) => `%${s.replace(/[,()*%\\]/g, " ").trim()}%`;

export async function listExpenses(
  supabase: Db,
  organizationId: string,
  {
    search,
    page = 1,
    status,
  }: { search?: string; page?: number; status?: PaymentStatus } = {},
): Promise<{ expenses: ExpenseListItem[]; total: number }> {
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from("expenses")
    .select("*, supplier:suppliers(company_name, contact_person)", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status) query = query.eq("payment_status", status);

  const term = search?.trim();
  if (term) {
    query = query.or(`description.ilike.${likeTerm(term)},category.ilike.${likeTerm(term)}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const expenses = (data ?? []).map((row: Row) => ({
    ...mapExpense(row),
    supplierName: supplierName((row.supplier as Row | null) ?? null),
  }));
  return { expenses, total: count ?? 0 };
}

/** Expenses that still have an outstanding balance, for the payment picker. */
export async function listOpenExpenseOptions(
  supabase: Db,
  organizationId: string,
): Promise<{ id: string; label: string; currency: string; remaining: number }[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, description, category, amount, currency, expense_date, payments(amount)")
    .eq("organization_id", organizationId)
    .in("payment_status", ["UNPAID", "PARTIALLY_PAID"])
    .order("expense_date", { ascending: false });
  if (error) throw error;

  return (data ?? [])
    .map((row: Row) => {
      const paid = ((row.payments as { amount: unknown }[] | null) ?? []).reduce(
        (sum, p) => sum + Number(p.amount ?? 0),
        0,
      );
      const remaining = Math.max(Number(row.amount ?? 0) - paid, 0);
      const label = str(row.description) || str(row.category) || "Cheltuială";
      return {
        id: row.id as string,
        label: `${label} · ${row.expense_date}`,
        currency: (row.currency as string) ?? "RON",
        remaining,
      };
    })
    .filter((o) => o.remaining > 0.004);
}

export async function getExpense(
  supabase: Db,
  organizationId: string,
  id: string,
): Promise<(Expense & { supplierName: string | null; projectName: string | null }) | null> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*, supplier:suppliers(company_name, contact_person), project:projects(name)")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...mapExpense(data),
    supplierName: supplierName((data.supplier as Row | null) ?? null),
    projectName: str((data.project as Row | null)?.name),
  };
}
