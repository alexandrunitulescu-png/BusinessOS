/**
 * Country-neutral intermediate representation of an invoice for e-invoicing
 * (M0 §10 — "Invoice -> model intermediar neutru"). Everything downstream (UBL
 * generation, validation, the provider) works off this, so switching countries
 * or output formats never touches the invoicing domain.
 */

export type NeutralAddress = {
  line: string | null;
  city: string | null;
  county: string | null;
  postalCode: string | null;
  countryCode: string;
};

export type NeutralParty = {
  legalName: string;
  tradeName: string | null;
  taxId: string | null;
  vatId: string | null;
  registrationNumber: string | null;
  address: NeutralAddress;
  email: string | null;
  phone: string | null;
};

export type NeutralLine = {
  id: string;
  description: string;
  quantity: number;
  /** Raw unit label as entered; mapping to a UN/ECE code is a country concern. */
  unit: string;
  unitPrice: number;
  vatRate: number;
  /** Net amount after discount, before VAT. */
  lineNet: number;
  lineVat: number;
};

export type NeutralTaxSubtotal = {
  vatRate: number;
  taxableAmount: number;
  taxAmount: number;
};

export type NeutralEInvoice = {
  documentNumber: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  note: string | null;
  paymentIban: string | null;
  seller: NeutralParty;
  buyer: NeutralParty;
  lines: NeutralLine[];
  taxBreakdown: NeutralTaxSubtotal[];
  totals: { net: number; vat: number; payable: number };
};
