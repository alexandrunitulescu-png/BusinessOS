/**
 * Deterministic money math for invoices (M0 §4 — "calcule deterministe",
 * `numeric(14,2)`, never float drift). All arithmetic runs in integer cents;
 * the only floating step is the initial `unitPrice × quantity`, immediately
 * rounded. Rounding order is fixed and documented so the same inputs always
 * produce the same stored `line_total` / `subtotal` / `vat_total` / `total`.
 */

export type LineInput = {
  /** up to 4 decimals */
  quantity: number;
  /** money, 2 decimals */
  unitPrice: number;
  /** VAT percentage, e.g. 19 */
  vatRate: number;
  /** discount percentage applied to the line gross, e.g. 10 */
  discountPercent: number;
};

export type LineTotals = {
  /** line net after discount, before VAT — the `invoice_lines.line_total` column */
  lineNet: number;
  /** VAT amount for the line */
  lineVat: number;
};

export type InvoiceTotals = {
  lines: LineTotals[];
  subtotal: number;
  vatTotal: number;
  total: number;
};

const toCents = (amount: number): number => Math.round((amount || 0) * 100);
const fromCents = (cents: number): number => cents / 100;
const roundCents = (value: number): number => Math.round(value);

/** Per-line: gross → discount → net → VAT, each rounded to the cent. */
export function computeLine(line: LineInput): LineTotals {
  const grossCents = roundCents(toCents(line.unitPrice) * (line.quantity || 0));
  const discountCents = roundCents((grossCents * (line.discountPercent || 0)) / 100);
  const netCents = grossCents - discountCents;
  const vatCents = roundCents((netCents * (line.vatRate || 0)) / 100);
  return { lineNet: fromCents(netCents), lineVat: fromCents(vatCents) };
}

/** Invoice totals: sum the already-rounded line amounts (exact). */
export function computeInvoice(lines: LineInput[]): InvoiceTotals {
  const computed = lines.map(computeLine);
  const subtotalCents = computed.reduce((sum, l) => sum + toCents(l.lineNet), 0);
  const vatCents = computed.reduce((sum, l) => sum + toCents(l.lineVat), 0);
  return {
    lines: computed,
    subtotal: fromCents(subtotalCents),
    vatTotal: fromCents(vatCents),
    total: fromCents(subtotalCents + vatCents),
  };
}
