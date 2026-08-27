import type { InvoiceWithLines } from "@/lib/invoicing/types";
import { invoiceNumberLabel } from "@/lib/invoicing/types";
import type { Client } from "@/lib/crm/types";
import { partyDisplayName } from "@/lib/crm/types";
import type { OrganizationBillingInfo } from "@/lib/organizations/queries";
import { INVOICE_STATUS_LABELS } from "@/lib/invoicing/schemas";
import { formatMoney, formatDate } from "@/lib/format";

function addressLines(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(", ");
}

/** Static, print-styled A4 invoice. Rendered on the server; no interactivity. */
export function InvoiceDocument({
  invoice,
  client,
  org,
}: {
  invoice: InvoiceWithLines;
  client: Client | null;
  org: OrganizationBillingInfo;
}) {
  const currency = invoice.currency;
  const isDraft = invoice.status === "DRAFT";

  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-[14mm] text-[13px] leading-relaxed text-slate-800 shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {org.tradeName || org.legalName}
          </p>
          <p className="text-slate-500">{org.legalName}</p>
          <p className="mt-1 text-slate-500">
            CUI {org.cui}
            {org.registrationNumber ? ` · ${org.registrationNumber}` : ""}
          </p>
          {org.vatRegistered && org.vatCode && (
            <p className="text-slate-500">Cod TVA {org.vatCode}</p>
          )}
          <p className="mt-1 text-slate-500">
            {addressLines([org.addressLine, org.city, org.county, org.postalCode, org.country])}
          </p>
          {(org.email || org.phone) && (
            <p className="text-slate-500">{addressLines([org.email, org.phone])}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold uppercase tracking-wide text-slate-900">Factură</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {invoiceNumberLabel(invoice)}
          </p>
          {isDraft && (
            <p className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              CIORNĂ – neemisă
            </p>
          )}
          {!isDraft && invoice.status !== "ISSUED" && (
            <p className="mt-1 text-xs text-slate-500">
              {INVOICE_STATUS_LABELS[invoice.status]}
            </p>
          )}
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client</p>
          {client ? (
            <>
              <p className="font-medium text-slate-900">{partyDisplayName(client)}</p>
              {client.cui && <p className="text-slate-500">CUI {client.cui}</p>}
              {client.registrationNumber && (
                <p className="text-slate-500">{client.registrationNumber}</p>
              )}
              <p className="text-slate-500">
                {addressLines([
                  client.addressLine,
                  client.city,
                  client.county,
                  client.country,
                ])}
              </p>
              {client.email && <p className="text-slate-500">{client.email}</p>}
            </>
          ) : (
            <p className="text-slate-400">—</p>
          )}
        </div>
        <div className="text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Data emiterii</span>
            <span>{formatDate(invoice.issueDate)}</span>
          </div>
          {invoice.dueDate && (
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Scadență</span>
              <span>{formatDate(invoice.dueDate)}</span>
            </div>
          )}
          {invoice.projectName && (
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Proiect</span>
              <span>{invoice.projectName}</span>
            </div>
          )}
          {invoice.paymentTerms && (
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Termeni de plată</span>
              <span>{invoice.paymentTerms}</span>
            </div>
          )}
        </div>
      </section>

      <table className="mt-6 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-y border-slate-300 text-left text-slate-500">
            <th className="py-2 pr-2 font-semibold">Descriere</th>
            <th className="py-2 px-2 text-right font-semibold">Cant.</th>
            <th className="py-2 px-2 font-semibold">UM</th>
            <th className="py-2 px-2 text-right font-semibold">Preț unitar</th>
            <th className="py-2 px-2 text-right font-semibold">Disc.</th>
            <th className="py-2 px-2 text-right font-semibold">TVA</th>
            <th className="py-2 pl-2 text-right font-semibold">Valoare</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id} className="border-b border-slate-100 align-top">
              <td className="py-2 pr-2">{line.description}</td>
              <td className="py-2 px-2 text-right tabular-nums">{line.quantity}</td>
              <td className="py-2 px-2">{line.unit}</td>
              <td className="py-2 px-2 text-right tabular-nums">
                {formatMoney(line.unitPrice, currency)}
              </td>
              <td className="py-2 px-2 text-right tabular-nums">
                {line.discountPercent ? `${line.discountPercent}%` : "—"}
              </td>
              <td className="py-2 px-2 text-right tabular-nums">{line.vatRate}%</td>
              <td className="py-2 pl-2 text-right tabular-nums">
                {formatMoney(line.lineTotal, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-4 flex justify-end">
        <div className="w-64 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="tabular-nums">{formatMoney(invoice.subtotal, currency)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-slate-500">TVA</span>
            <span className="tabular-nums">{formatMoney(invoice.vatTotal, currency)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-300 pt-2 text-base font-semibold text-slate-900">
            <span>Total de plată</span>
            <span className="tabular-nums">{formatMoney(invoice.total, currency)}</span>
          </div>
          {invoice.exchangeRate && currency !== "RON" && (
            <p className="mt-1 text-right text-xs text-slate-400">
              Curs {invoice.exchangeRate} RON/{currency}
            </p>
          )}
        </div>
      </section>

      {org.iban && (
        <p className="mt-6 text-sm text-slate-600">
          Plata în contul {org.iban}
          {org.bankName ? ` deschis la ${org.bankName}` : ""}.
        </p>
      )}
      {invoice.notes && (
        <p className="mt-3 whitespace-pre-line text-sm text-slate-500">{invoice.notes}</p>
      )}
    </div>
  );
}
