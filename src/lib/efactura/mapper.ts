import "server-only";
import type { InvoiceWithLines } from "@/lib/invoicing/types";
import { invoiceNumberLabel } from "@/lib/invoicing/types";
import type { Client } from "@/lib/crm/types";
import { partyDisplayName } from "@/lib/crm/types";
import type { OrganizationBillingInfo } from "@/lib/organizations/queries";
import { computeInvoice } from "@/lib/invoicing/calculations";
import type {
  NeutralEInvoice,
  NeutralLine,
  NeutralParty,
  NeutralTaxSubtotal,
} from "@/lib/efactura/model";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sellerParty(org: OrganizationBillingInfo): NeutralParty {
  return {
    legalName: org.legalName,
    tradeName: org.tradeName,
    taxId: org.cui,
    vatId: org.vatRegistered ? org.vatCode : null,
    registrationNumber: org.registrationNumber,
    address: {
      line: org.addressLine,
      city: org.city,
      county: org.county,
      postalCode: org.postalCode,
      countryCode: org.country || "RO",
    },
    email: org.email,
    phone: org.phone,
  };
}

function buyerParty(client: Client | null): NeutralParty {
  if (!client) {
    return {
      legalName: "Client necunoscut",
      tradeName: null,
      taxId: null,
      vatId: null,
      registrationNumber: null,
      address: { line: null, city: null, county: null, postalCode: null, countryCode: "RO" },
      email: null,
      phone: null,
    };
  }
  return {
    legalName: partyDisplayName(client),
    tradeName: null,
    taxId: client.type === "COMPANY" ? client.cui : null,
    vatId: client.type === "COMPANY" ? client.cui : null,
    registrationNumber: client.registrationNumber,
    address: {
      line: client.addressLine,
      city: client.city,
      county: client.county,
      postalCode: null,
      countryCode: client.country || "RO",
    },
    email: client.email,
    phone: client.phone,
  };
}

/** Groups line VAT into one subtotal per distinct rate. */
function taxBreakdown(lines: NeutralLine[]): NeutralTaxSubtotal[] {
  const byRate = new Map<number, NeutralTaxSubtotal>();
  for (const line of lines) {
    const existing = byRate.get(line.vatRate) ?? {
      vatRate: line.vatRate,
      taxableAmount: 0,
      taxAmount: 0,
    };
    existing.taxableAmount = round2(existing.taxableAmount + line.lineNet);
    existing.taxAmount = round2(existing.taxAmount + line.lineVat);
    byRate.set(line.vatRate, existing);
  }
  return [...byRate.values()].sort((a, b) => a.vatRate - b.vatRate);
}

/** Invoice (+ its client and the issuing org) -> neutral e-invoice model. */
export function mapInvoiceToNeutral(
  invoice: InvoiceWithLines,
  client: Client | null,
  org: OrganizationBillingInfo,
): NeutralEInvoice {
  const totals = computeInvoice(
    invoice.lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      vatRate: l.vatRate,
      discountPercent: l.discountPercent,
    })),
  );

  const lines: NeutralLine[] = invoice.lines.map((l, i) => ({
    id: String(i + 1),
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unitPrice,
    vatRate: l.vatRate,
    lineNet: totals.lines[i]?.lineNet ?? 0,
    lineVat: totals.lines[i]?.lineVat ?? 0,
  }));

  return {
    documentNumber: invoiceNumberLabel(invoice),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    note: invoice.notes,
    paymentIban: org.iban,
    seller: sellerParty(org),
    buyer: buyerParty(client),
    lines,
    taxBreakdown: taxBreakdown(lines),
    totals: { net: totals.subtotal, vat: totals.vatTotal, payable: totals.total },
  };
}
