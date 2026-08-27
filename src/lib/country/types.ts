import type { EInvoiceProvider } from "@/lib/efactura/provider";

export type TaxIdValidation = {
  valid: boolean;
  /** Normalized form (e.g. digits only, uppercased prefix), when derivable. */
  normalized: string;
  message?: string;
};

export type LegalFieldRequirement = {
  /** Dotted path into the neutral e-invoice model, e.g. "seller.taxId". */
  field: string;
  label: string;
  required: boolean;
};

/**
 * Country-specific fiscal behaviour, resolved from `organizations.country`
 * (M0 §11). Core invoicing/expenses/payments never import a concrete country
 * module directly — only this interface.
 */
export interface CountryModule {
  code: string;
  /** Formal (checksum) validation of a company tax id — never an external call. */
  validateTaxId(taxId: string): TaxIdValidation;
  /** The e-invoice provider for this country, or null if none / not built yet. */
  getEInvoiceProvider(): EInvoiceProvider | null;
  /** Fields a compliant invoice must carry in this country. */
  getInvoiceLegalFields(): LegalFieldRequirement[];
}
