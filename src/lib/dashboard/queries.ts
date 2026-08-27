import type { SupabaseClient } from "@supabase/supabase-js";

/** Invoice statuses that still represent money owed to the organization. */
const OPEN_INVOICE_STATUSES = ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"] as const;

export type DashboardMetrics = {
  /** Payments received against invoices in the current calendar month. */
  incomeThisMonth: number;
  /** Value invoiced (non-draft, non-cancelled) in the current calendar month. */
  billedThisMonth: number;
  /** Expenses recorded in the current calendar month. */
  expensesThisMonth: number;
  /** Total still uncollected across all open invoices (all time). */
  outstanding: number;
  /** Open invoices already past their due date. */
  overdueCount: number;
  /** Invoices sitting in DRAFT. */
  draftCount: number;
  /** Active clients. */
  clientsCount: number;
  currency: string;
};

function sum(rows: { amount?: number | null; total?: number | null }[], key: "amount" | "total") {
  return rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0);
}

function monthRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const toISODate = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toISODate(start), end: toISODate(nextMonth) };
}

/**
 * Aggregates the dashboard KPIs for one organization. Every query is also
 * explicitly scoped by `organization_id` on top of RLS (M0 §5 — the app never
 * trusts a single layer). Sums are done in JS because PostgREST can't return a
 * bare aggregate without a database view, which isn't worth adding yet.
 */
export async function getDashboardMetrics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  organizationId: string,
  currency: string,
): Promise<DashboardMetrics> {
  const { start, end } = monthRange();
  const today = new Date().toISOString().slice(0, 10);
  const scoped = () => ({ organization_id: organizationId });

  const [
    incomePayments,
    billedInvoices,
    monthExpenses,
    openInvoices,
    openPayments,
    overdue,
    drafts,
    clients,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .match(scoped())
      .not("invoice_id", "is", null)
      .gte("payment_date", start)
      .lt("payment_date", end),
    supabase
      .from("invoices")
      .select("total")
      .match(scoped())
      .not("status", "in", "(DRAFT,CANCELLED)")
      .gte("issue_date", start)
      .lt("issue_date", end),
    supabase
      .from("expenses")
      .select("amount")
      .match(scoped())
      .gte("expense_date", start)
      .lt("expense_date", end),
    supabase
      .from("invoices")
      .select("id, total")
      .match(scoped())
      .in("status", OPEN_INVOICE_STATUSES as unknown as string[]),
    supabase
      .from("payments")
      .select("amount, invoice_id")
      .match(scoped())
      .not("invoice_id", "is", null),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .match(scoped())
      .in("status", OPEN_INVOICE_STATUSES as unknown as string[])
      .lt("due_date", today),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .match(scoped())
      .eq("status", "DRAFT"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .match(scoped())
      .eq("is_active", true),
  ]);

  const firstError =
    incomePayments.error ||
    billedInvoices.error ||
    monthExpenses.error ||
    openInvoices.error ||
    openPayments.error ||
    overdue.error ||
    drafts.error ||
    clients.error;
  if (firstError) throw firstError;

  const openInvoiceIds = new Set((openInvoices.data ?? []).map((r) => r.id));
  const paidOnOpen = (openPayments.data ?? [])
    .filter((p) => openInvoiceIds.has(p.invoice_id))
    .reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
  const openTotal = sum(openInvoices.data ?? [], "total");

  return {
    incomeThisMonth: sum(incomePayments.data ?? [], "amount"),
    billedThisMonth: sum(billedInvoices.data ?? [], "total"),
    expensesThisMonth: sum(monthExpenses.data ?? [], "amount"),
    outstanding: Math.max(openTotal - paidOnOpen, 0),
    overdueCount: overdue.count ?? 0,
    draftCount: drafts.count ?? 0,
    clientsCount: clients.count ?? 0,
    currency,
  };
}
