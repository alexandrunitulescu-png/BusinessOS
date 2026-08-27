import type { CountryModule, LegalFieldRequirement, TaxIdValidation } from "@/lib/country/types";
import { notConfiguredProvider, type EInvoiceProvider } from "@/lib/efactura/provider";

/**
 * Control-digit weights for the Romanian CUI/CIF checksum. This is the public,
 * well-known formal validation algorithm (M0 §11 explicitly allows a checksum
 * check) — it is NOT an ANAF API call and has nothing to do with the e-Factura
 * request/response structure, which stays unimplemented until official docs.
 */
const CUI_WEIGHTS = "753217532";

export function validateRomanianCui(raw: string): TaxIdValidation {
  const digits = raw.trim().replace(/^RO/i, "").replace(/\s+/g, "");
  const normalized = /^\d+$/.test(digits) ? `RO${digits}` : raw.trim();

  if (!/^\d{2,10}$/.test(digits)) {
    return { valid: false, normalized, message: "CUI-ul trebuie să aibă între 2 și 10 cifre." };
  }

  const control = Number(digits.slice(-1));
  const body = digits.slice(0, -1).padStart(9, "0");

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(body[i]) * Number(CUI_WEIGHTS[i]);
  }
  let expected = (sum * 10) % 11;
  if (expected === 10) expected = 0;

  return expected === control
    ? { valid: true, normalized }
    : { valid: false, normalized, message: "Cifra de control a CUI-ului nu este validă." };
}

const RO_INVOICE_LEGAL_FIELDS: LegalFieldRequirement[] = [
  { field: "seller.taxId", label: "CUI-ul emitentului", required: true },
  { field: "seller.legalName", label: "Denumirea legală a emitentului", required: true },
  { field: "seller.address", label: "Adresa emitentului", required: true },
  { field: "buyer.legalName", label: "Denumirea clientului", required: true },
  { field: "buyer.taxId", label: "CUI-ul clientului (persoană juridică)", required: false },
  { field: "documentNumber", label: "Serie și număr factură", required: true },
  { field: "issueDate", label: "Data emiterii", required: true },
  { field: "currency", label: "Moneda", required: true },
  { field: "lines", label: "Cel puțin o linie cu descriere, cantitate și preț", required: true },
  { field: "taxBreakdown", label: "Defalcarea TVA pe cote", required: true },
  { field: "totals.payable", label: "Total de plată", required: true },
];

export const RomaniaModule: CountryModule = {
  code: "RO",
  validateTaxId: validateRomanianCui,
  getEInvoiceProvider(): EInvoiceProvider | null {
    // TODO(M7 real): return new RomanianANAFEInvoiceProvider(config) once the
    // official ANAF e-Factura API documentation is available. Until then callers
    // get a provider that validates/previews but refuses every network call.
    return notConfiguredProvider;
  },
  getInvoiceLegalFields: () => RO_INVOICE_LEGAL_FIELDS,
};
