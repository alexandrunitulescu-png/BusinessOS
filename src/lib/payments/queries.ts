import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentMethod } from "@/lib/payments/schemas";
import type { Payment, PaymentListItem } from "@/lib/payments/types";

export const PAGE_SIZE = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

const num = (v: unknown): number => Number(v ?? 0);
const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

function mapPayment(row: Row): Payment {
  return {
    id: row.id as string,
    invoiceId: str(row.invoice_id),
    expenseId: str(row.expense_id),
    amount: num(row.amount),
    currency: (row.currency as string) ?? "RON",
    paymentDate: row.payment_date as string,
    paymentMethod: (row.payment_method as PaymentMethod) ?? "BANK_TRANSFER",
    reference: str(row.reference),
    notes: str(row.notes),
  };
}

function invoiceLabel(inv: Row | null): string {
  if (!inv) return "Factură ștearsă";
  if (inv.series && inv.number != null) {
    return `${inv.series}-${String(inv.number).padStart(4, "0")}`;
  }
  return "Factură ciornă";
}

export async function listPayments(
  supabase: Db,
  organizationId: string,
  { page = 1 }: { page?: number } = {},
): Promise<{ payments: PaymentListItem[]; total: number }> {
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("payments")
    .select(
      "*, invoice:invoices(series, number), expense:expenses(description, category)",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const payments: PaymentListItem[] = (data ?? []).map((row: Row) => {
    const p = mapPayment(row);
    if (p.invoiceId) {
      return {
        ...p,
        direction: "IN",
        targetLabel: invoiceLabel((row.invoice as Row | null) ?? null),
        targetHref: `/invoices/${p.invoiceId}`,
      };
    }
    const exp = (row.expense as Row | null) ?? null;
    return {
      ...p,
      direction: "OUT",
      targetLabel:
        str(exp?.description) || str(exp?.category) || "Cheltuială",
      targetHref: `/expenses/${p.expenseId}`,
    };
  });
  return { payments, total: count ?? 0 };
}

export async function listPaymentsForInvoice(
  supabase: Db,
  organizationId: string,
  invoiceId: string,
): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapPayment);
}

export async function listPaymentsForExpense(
  supabase: Db,
  organizationId: string,
  expenseId: string,
): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("expense_id", expenseId)
    .order("payment_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapPayment);
}
