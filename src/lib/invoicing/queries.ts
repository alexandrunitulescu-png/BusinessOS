import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceStatus } from "@/lib/invoicing/schemas";
import type {
  Invoice,
  InvoiceLine,
  InvoiceListItem,
  InvoiceSeriesOption,
  InvoiceWithLines,
} from "@/lib/invoicing/types";
import { invoiceNumberLabel } from "@/lib/invoicing/types";

export const PAGE_SIZE = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

const num = (v: unknown): number => Number(v ?? 0);
const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

function clientName(client: Row | null): string | null {
  if (!client) return null;
  if (client.type === "PERSON") {
    return (
      [str(client.first_name), str(client.last_name)].filter(Boolean).join(" ") || "Persoană"
    );
  }
  return str(client.company_name) || "Companie";
}

function mapInvoice(row: Row): Invoice {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    projectId: str(row.project_id),
    seriesId: row.series_id as string,
    series: str(row.series),
    number: row.number == null ? null : Number(row.number),
    issueDate: row.issue_date as string,
    dueDate: str(row.due_date),
    currency: (row.currency as string) ?? "RON",
    exchangeRate: row.exchange_rate == null ? null : Number(row.exchange_rate),
    subtotal: num(row.subtotal),
    vatTotal: num(row.vat_total),
    total: num(row.total),
    notes: str(row.notes),
    paymentTerms: str(row.payment_terms),
    status: (row.status as InvoiceStatus) ?? "DRAFT",
  };
}

function mapLine(row: Row): InvoiceLine {
  return {
    id: row.id as string,
    productServiceId: str(row.product_service_id),
    description: (row.description as string) ?? "",
    quantity: num(row.quantity),
    unit: (row.unit as string) ?? "buc",
    unitPrice: num(row.unit_price),
    vatRate: num(row.vat_rate),
    discountPercent: num(row.discount_percent),
    lineTotal: num(row.line_total),
    sortOrder: num(row.sort_order),
  };
}

const likeTerm = (s: string) => `%${s.replace(/[,()*%\\]/g, " ").trim()}%`;

export async function listInvoices(
  supabase: Db,
  organizationId: string,
  {
    search,
    page = 1,
    status,
  }: { search?: string; page?: number; status?: InvoiceStatus } = {},
): Promise<{ invoices: InvoiceListItem[]; total: number }> {
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from("invoices")
    .select(
      "id, series, number, status, issue_date, due_date, total, currency, client:clients(type, company_name, first_name, last_name)",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("issue_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status) query = query.eq("status", status);

  const term = search?.trim();
  if (term) {
    const filters = [`series.ilike.${likeTerm(term)}`, `notes.ilike.${likeTerm(term)}`];
    if (/^\d+$/.test(term)) filters.push(`number.eq.${term}`);
    query = query.or(filters.join(","));
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const invoices = (data ?? []).map((row: Row) => {
    const inv = mapInvoice(row);
    return {
      id: inv.id,
      number: invoiceNumberLabel(inv),
      status: inv.status,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      total: inv.total,
      currency: inv.currency,
      clientName: clientName((row.client as Row | null) ?? null),
    };
  });
  return { invoices, total: count ?? 0 };
}

export async function getInvoiceWithLines(
  supabase: Db,
  organizationId: string,
  id: string,
): Promise<InvoiceWithLines | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "*, client:clients(type, company_name, first_name, last_name), project:projects(name)",
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: lineRows, error: lineErr } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", id)
    .order("sort_order", { ascending: true });
  if (lineErr) throw lineErr;

  const invoice = mapInvoice(data);
  return {
    ...invoice,
    lines: (lineRows ?? []).map(mapLine),
    clientName: clientName((data.client as Row | null) ?? null),
    projectName: str((data.project as Row | null)?.name),
  };
}

/** Issued invoices that still have an outstanding balance, for the payment picker. */
export async function listOpenInvoiceOptions(
  supabase: Db,
  organizationId: string,
): Promise<{ id: string; label: string; currency: string; remaining: number }[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, series, number, total, currency, payments(amount)")
    .eq("organization_id", organizationId)
    .in("status", ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"])
    .order("issue_date", { ascending: false });
  if (error) throw error;

  return (data ?? [])
    .map((row: Row) => {
      const paid = ((row.payments as { amount: unknown }[] | null) ?? []).reduce(
        (sum, p) => sum + Number(p.amount ?? 0),
        0,
      );
      const remaining = Math.max(Number(row.total ?? 0) - paid, 0);
      const label =
        row.series && row.number != null
          ? `${row.series}-${String(row.number).padStart(4, "0")}`
          : "Ciornă";
      return { id: row.id as string, label, currency: (row.currency as string) ?? "RON", remaining };
    })
    .filter((o) => o.remaining > 0.004);
}

export async function listInvoiceSeries(
  supabase: Db,
  organizationId: string,
): Promise<InvoiceSeriesOption[]> {
  const { data, error } = await supabase
    .from("invoice_series")
    .select("id, series, next_number, is_default")
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .order("series", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({
    id: row.id as string,
    series: row.series as string,
    nextNumber: Number(row.next_number ?? 1),
    isDefault: row.is_default === true,
  }));
}
