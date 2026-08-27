import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

const OPEN_INVOICE_STATUSES = ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"] as const;

const n = (v: unknown) => Number(v ?? 0);
const round2 = (x: number) => Math.round(x * 100) / 100;

function clientName(c: Row | null): string {
  if (!c) return "—";
  if (c.type === "PERSON") {
    return (
      [c.first_name, c.last_name].filter(Boolean).join(" ").trim() ||
      String(c.company_name ?? "Persoană")
    );
  }
  return String(c.company_name ?? "Companie");
}

export type MonthlyPoint = { month: string; invoiced: number; expenses: number };
export type AgingBucket = { label: string; count: number; amount: number };
export type TopClient = { name: string; amount: number };

export type FinancialReport = {
  from: string;
  to: string;
  currency: string;
  invoiced: number;
  collected: number;
  expenses: number;
  paidOut: number;
  vatCollected: number;
  vatDeductible: number;
  profit: number;
  outstanding: number;
  invoiceCount: number;
  monthly: MonthlyPoint[];
  aging: AgingBucket[];
  topClients: TopClient[];
};

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end && out.length < 36) {
    out.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

export async function getFinancialReport(
  supabase: Db,
  organizationId: string,
  currency: string,
  from: string,
  to: string,
): Promise<FinancialReport> {
  const scoped = { organization_id: organizationId };
  const today = new Date().toISOString().slice(0, 10);

  const [rangeInvoices, openInvoices, rangeExpenses, paymentsIn, paymentsOut] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("client_id, issue_date, total, vat_total, client:clients(type, company_name, first_name, last_name)")
        .match(scoped)
        .not("status", "in", "(DRAFT,CANCELLED)")
        .gte("issue_date", from)
        .lte("issue_date", to),
      supabase
        .from("invoices")
        .select("total, due_date, payments(amount)")
        .match(scoped)
        .in("status", OPEN_INVOICE_STATUSES as unknown as string[]),
      supabase
        .from("expenses")
        .select("expense_date, amount, vat_amount")
        .match(scoped)
        .gte("expense_date", from)
        .lte("expense_date", to),
      supabase
        .from("payments")
        .select("amount, payment_date")
        .match(scoped)
        .not("invoice_id", "is", null)
        .gte("payment_date", from)
        .lte("payment_date", to),
      supabase
        .from("payments")
        .select("amount, payment_date")
        .match(scoped)
        .not("expense_id", "is", null)
        .gte("payment_date", from)
        .lte("payment_date", to),
    ]);

  const firstError =
    rangeInvoices.error ||
    openInvoices.error ||
    rangeExpenses.error ||
    paymentsIn.error ||
    paymentsOut.error;
  if (firstError) throw firstError;

  const invRows = (rangeInvoices.data ?? []) as Row[];
  const expRows = (rangeExpenses.data ?? []) as Row[];

  const invoiced = round2(invRows.reduce((s, r) => s + n(r.total), 0));
  const vatCollected = round2(invRows.reduce((s, r) => s + n(r.vat_total), 0));
  const collected = round2((paymentsIn.data ?? []).reduce((s: number, r: Row) => s + n(r.amount), 0));
  const expenses = round2(expRows.reduce((s, r) => s + n(r.amount), 0));
  const vatDeductible = round2(expRows.reduce((s, r) => s + n(r.vat_amount), 0));
  const paidOut = round2((paymentsOut.data ?? []).reduce((s: number, r: Row) => s + n(r.amount), 0));

  // outstanding + aging over ALL open invoices
  const aging: AgingBucket[] = [
    { label: "Neajunse la scadență", count: 0, amount: 0 },
    { label: "1–30 zile", count: 0, amount: 0 },
    { label: "31–60 zile", count: 0, amount: 0 },
    { label: "61–90 zile", count: 0, amount: 0 },
    { label: "Peste 90 zile", count: 0, amount: 0 },
  ];
  let outstanding = 0;
  for (const r of (openInvoices.data ?? []) as Row[]) {
    const paid = ((r.payments as { amount: unknown }[] | null) ?? []).reduce(
      (s, p) => s + n(p.amount),
      0,
    );
    const remaining = Math.max(n(r.total) - paid, 0);
    if (remaining <= 0.004) continue;
    outstanding += remaining;

    const due = typeof r.due_date === "string" ? r.due_date : null;
    let bucket = 0;
    if (due) {
      const days = Math.floor((Date.parse(today) - Date.parse(due)) / 86_400_000);
      if (days <= 0) bucket = 0;
      else if (days <= 30) bucket = 1;
      else if (days <= 60) bucket = 2;
      else if (days <= 90) bucket = 3;
      else bucket = 4;
    }
    aging[bucket].count += 1;
    aging[bucket].amount = round2(aging[bucket].amount + remaining);
  }

  // monthly
  const months = monthsBetween(from, to);
  const monthly: MonthlyPoint[] = months.map((m) => ({ month: m, invoiced: 0, expenses: 0 }));
  const monthIndex = new Map(monthly.map((p, i) => [p.month, i]));
  for (const r of invRows) {
    const m = String(r.issue_date).slice(0, 7);
    const i = monthIndex.get(m);
    if (i !== undefined) monthly[i].invoiced = round2(monthly[i].invoiced + n(r.total));
  }
  for (const r of expRows) {
    const m = String(r.expense_date).slice(0, 7);
    const i = monthIndex.get(m);
    if (i !== undefined) monthly[i].expenses = round2(monthly[i].expenses + n(r.amount));
  }

  // top clients
  const byClient = new Map<string, { name: string; amount: number }>();
  for (const r of invRows) {
    const key = String(r.client_id ?? "none");
    const entry = byClient.get(key) ?? {
      name: clientName((r.client as Row | null) ?? null),
      amount: 0,
    };
    entry.amount = round2(entry.amount + n(r.total));
    byClient.set(key, entry);
  }
  const topClients = [...byClient.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    from,
    to,
    currency,
    invoiced,
    collected,
    expenses,
    paidOut,
    vatCollected,
    vatDeductible,
    profit: round2(invoiced - expenses),
    outstanding: round2(outstanding),
    invoiceCount: invRows.length,
    monthly,
    aging,
    topClients,
  };
}
