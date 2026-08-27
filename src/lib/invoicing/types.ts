import type { InvoiceStatus } from "@/lib/invoicing/schemas";

export type InvoiceLine = {
  id: string;
  productServiceId: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  discountPercent: number;
  lineTotal: number;
  sortOrder: number;
};

export type Invoice = {
  id: string;
  clientId: string;
  projectId: string | null;
  seriesId: string;
  /** Frozen at issue time; null while DRAFT. */
  series: string | null;
  number: number | null;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  exchangeRate: number | null;
  subtotal: number;
  vatTotal: number;
  total: number;
  notes: string | null;
  paymentTerms: string | null;
  status: InvoiceStatus;
};

export type InvoiceWithLines = Invoice & {
  lines: InvoiceLine[];
  clientName: string | null;
  projectName: string | null;
};

export type InvoiceListItem = {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  total: number;
  currency: string;
  clientName: string | null;
};

export type InvoiceSeriesOption = {
  id: string;
  series: string;
  nextNumber: number;
  isDefault: boolean;
};

/** "FCT-0001" style label, or "ciornă" while unissued. */
export function invoiceNumberLabel(inv: Pick<Invoice, "series" | "number" | "status">): string {
  if (inv.series && inv.number != null) {
    return `${inv.series}-${String(inv.number).padStart(4, "0")}`;
  }
  return "ciornă";
}
