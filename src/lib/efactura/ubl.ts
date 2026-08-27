import type { NeutralEInvoice, NeutralParty } from "@/lib/efactura/model";

/**
 * Generates a base UBL 2.1 `Invoice` document from the neutral model. UBL 2.1 is
 * an OASIS open standard (and the basis of EN 16931) — this generator is not
 * ANAF-specific.
 *
 * NOT YET RO_CIUS-CONFORMANT. The Romanian customization (the exact
 * `CustomizationID` / `ProfileID`, mandatory scheme identifiers for CUI, the
 * county code list, UN/ECE unit codes, rounding rules and the schematron) must
 * be filled in from the current official ANAF/MF documentation before any real
 * submission. Those spots are marked `TODO(ANAF)`.
 */

const NS = {
  inv: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
  cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
};

function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const money = (n: number) => n.toFixed(2);
const qty = (n: number) => (Number.isInteger(n) ? n.toFixed(2) : String(n));

function partyXml(party: NeutralParty): string {
  const a = party.address;
  return `
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(party.tradeName || party.legalName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        ${a.line ? `<cbc:StreetName>${esc(a.line)}</cbc:StreetName>` : ""}
        ${a.city ? `<cbc:CityName>${esc(a.city)}</cbc:CityName>` : ""}
        ${a.postalCode ? `<cbc:PostalZone>${esc(a.postalCode)}</cbc:PostalZone>` : ""}
        ${a.county ? `<cbc:CountrySubentity>${esc(a.county)}</cbc:CountrySubentity>` : ""}
        <cac:Country><cbc:IdentificationCode>${esc(a.countryCode)}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${
        party.vatId
          ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(party.vatId)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>`
          : ""
      }
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(party.legalName)}</cbc:RegistrationName>
        ${
          party.taxId
            ? `<cbc:CompanyID>${esc(party.taxId)}</cbc:CompanyID>` /* TODO(ANAF): schemeID for CUI */
            : ""
        }
      </cac:PartyLegalEntity>
      ${party.email ? `<cac:Contact><cbc:ElectronicMail>${esc(party.email)}</cbc:ElectronicMail></cac:Contact>` : ""}
    </cac:Party>
  `.trim();
}

export function toUBL(model: NeutralEInvoice): string {
  const cur = esc(model.currency);

  const taxSubtotals = model.taxBreakdown
    .map(
      (t) => `
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${cur}">${money(t.taxableAmount)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${cur}">${money(t.taxAmount)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>${t.vatRate > 0 ? "S" : "Z"}</cbc:ID>
          <cbc:Percent>${money(t.vatRate)}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>`,
    )
    .join("");

  const lines = model.lines
    .map(
      (l) => `
    <cac:InvoiceLine>
      <cbc:ID>${esc(l.id)}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${esc(l.unit)}">${qty(l.quantity)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${cur}">${money(l.lineNet)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Name>${esc(l.description)}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>${l.vatRate > 0 ? "S" : "Z"}</cbc:ID>
          <cbc:Percent>${money(l.vatRate)}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="${cur}">${money(l.unitPrice)}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="${NS.inv}" xmlns:cac="${NS.cac}" xmlns:cbc="${NS.cbc}">
  <!-- TODO(ANAF): set the real RO_CIUS CustomizationID / ProfileID from official docs -->
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ID>${esc(model.documentNumber)}</cbc:ID>
  <cbc:IssueDate>${esc(model.issueDate)}</cbc:IssueDate>
  ${model.dueDate ? `<cbc:DueDate>${esc(model.dueDate)}</cbc:DueDate>` : ""}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  ${model.note ? `<cbc:Note>${esc(model.note)}</cbc:Note>` : ""}
  <cbc:DocumentCurrencyCode>${cur}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>${partyXml(model.seller)}</cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>${partyXml(model.buyer)}</cac:AccountingCustomerParty>
  ${
    model.paymentIban
      ? `<cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount><cbc:ID>${esc(model.paymentIban)}</cbc:ID></cac:PayeeFinancialAccount>
  </cac:PaymentMeans>`
      : ""
  }
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${cur}">${money(model.totals.vat)}</cbc:TaxAmount>${taxSubtotals}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${cur}">${money(model.totals.net)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${cur}">${money(model.totals.net)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${cur}">${money(model.totals.payable)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${cur}">${money(model.totals.payable)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${lines}
</Invoice>
`;
}
