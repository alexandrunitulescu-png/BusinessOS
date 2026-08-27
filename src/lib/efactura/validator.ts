import type { NeutralEInvoice } from "@/lib/efactura/model";
import type { CountryModule } from "@/lib/country/types";

export type ValidationIssue = {
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

const CENT = 0.01;

/**
 * Structural / arithmetic validation of the neutral model against the country
 * module's legal-field list. This is NOT the RO_CIUS schematron — that requires
 * the official ANAF rule set and runs in the real M7 provider.
 */
export function validateNeutralEInvoice(
  model: NeutralEInvoice,
  country: CountryModule,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const err = (field: string, message: string) =>
    issues.push({ field, message, severity: "error" });
  const warn = (field: string, message: string) =>
    issues.push({ field, message, severity: "warning" });

  // ---- required legal fields ----
  for (const req of country.getInvoiceLegalFields()) {
    if (!req.required) continue;
    if (isMissing(model, req.field)) {
      err(req.field, `${req.label} lipsește.`);
    }
  }

  // ---- tax id checksums ----
  if (model.seller.taxId) {
    const v = country.validateTaxId(model.seller.taxId);
    if (!v.valid) err("seller.taxId", v.message ?? "CUI emitent invalid.");
  }
  if (model.buyer.taxId) {
    const v = country.validateTaxId(model.buyer.taxId);
    if (!v.valid) warn("buyer.taxId", v.message ?? "CUI client invalid.");
  }

  // ---- arithmetic consistency ----
  const linesNet = round2(model.lines.reduce((s, l) => s + l.lineNet, 0));
  const linesVat = round2(model.lines.reduce((s, l) => s + l.lineVat, 0));
  if (Math.abs(linesNet - model.totals.net) > CENT) {
    err("totals.net", "Suma liniilor nu se potrivește cu subtotalul facturii.");
  }
  if (Math.abs(linesVat - model.totals.vat) > CENT) {
    err("totals.vat", "TVA-ul pe linii nu se potrivește cu TVA-ul total.");
  }
  if (Math.abs(round2(model.totals.net + model.totals.vat) - model.totals.payable) > CENT) {
    err("totals.payable", "Total ≠ subtotal + TVA.");
  }

  const breakdownVat = round2(model.taxBreakdown.reduce((s, t) => s + t.taxAmount, 0));
  if (Math.abs(breakdownVat - model.totals.vat) > CENT) {
    err("taxBreakdown", "Defalcarea TVA nu însumează TVA-ul total.");
  }

  // ---- line sanity ----
  model.lines.forEach((line, i) => {
    if (line.quantity <= 0) err(`lines.${i}.quantity`, `Linia ${i + 1}: cantitate ≤ 0.`);
    if (line.unitPrice < 0) err(`lines.${i}.unitPrice`, `Linia ${i + 1}: preț negativ.`);
    if (!line.description.trim()) err(`lines.${i}.description`, `Linia ${i + 1}: fără descriere.`);
  });

  if (model.lines.length === 0) err("lines", "Factura nu are nicio linie.");

  return { valid: issues.every((i) => i.severity !== "error"), issues };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isMissing(model: NeutralEInvoice, path: string): boolean {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, model);

  if (path === "lines") return !Array.isArray(value) || value.length === 0;
  if (path === "taxBreakdown") return !Array.isArray(value) || value.length === 0;
  if (path === "seller.address" || path === "buyer.address") {
    const addr = value as NeutralEInvoice["seller"]["address"] | undefined;
    return !addr || (!addr.line && !addr.city);
  }
  return value === null || value === undefined || value === "";
}
