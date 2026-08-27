import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getInvoiceWithLines } from "@/lib/invoicing/queries";
import { getClient, listClientOptions } from "@/lib/crm/queries";
import { listProjectOptions } from "@/lib/projects/queries";
import { listItemOptions } from "@/lib/catalog/queries";
import { listInvoiceSeries } from "@/lib/invoicing/queries";
import { getOrganizationBillingInfo } from "@/lib/organizations/queries";
import { deleteInvoiceAction } from "@/lib/invoicing/mutations";
import { listPaymentsForInvoice } from "@/lib/payments/queries";
import { invoiceNumberLabel } from "@/lib/invoicing/types";
import { INVOICE_STATUS_LABELS } from "@/lib/invoicing/schemas";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { InvoiceForm } from "@/components/invoicing/InvoiceForm";
import { InvoiceDocument } from "@/components/invoicing/InvoiceDocument";
import { InvoiceActions } from "@/components/invoicing/InvoiceActions";
import { PaymentsSection } from "@/components/payments/PaymentsSection";
import { prepareEInvoice } from "@/lib/efactura/prepare";
import { getLatestSubmission } from "@/lib/efactura/queries";
import { EInvoicePanel } from "@/components/efactura/EInvoicePanel";

export const metadata: Metadata = { title: "Factură · BusinessOS" };

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("money");
  const { id } = await params;

  const invoice = await getInvoiceWithLines(supabase, membership.id, id);
  if (!invoice) notFound();

  const canWrite = hasPermission(membership.role, "money", "write");
  const canDelete = hasPermission(membership.role, "money", "delete");
  const isDraft = invoice.status === "DRAFT";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={invoiceNumberLabel(invoice)}
        description={
          isDraft ? "Ciornă — editează liniile, apoi emite." : `Client: ${invoice.clientName ?? "—"}`
        }
        action={<Badge>{INVOICE_STATUS_LABELS[invoice.status]}</Badge>}
      />

      {isDraft && canWrite ? (
        <>
          <DraftEditor invoice={invoice} supabase={supabase} organizationId={membership.id} defaultCurrency={membership.defaultCurrency} />
          <div className="border-t border-slate-200 pt-5">
            <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/print/invoice/${invoice.id}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Vezi / printează PDF
            </a>
            {canWrite && <InvoiceActions invoiceId={invoice.id} status={invoice.status} />}
          </div>
          <PrintPreview supabase={supabase} organizationId={membership.id} clientId={invoice.clientId} invoice={invoice} />
          {invoice.status !== "CANCELLED" && (
            <InvoicePayments
              invoiceId={invoice.id}
              total={invoice.total}
              currency={invoice.currency}
              supabase={supabase}
              organizationId={membership.id}
              canWrite={canWrite}
              canDelete={canDelete}
            />
          )}
          {invoice.status !== "CANCELLED" && (
            <EInvoiceBlock
              invoiceId={invoice.id}
              supabase={supabase}
              organizationId={membership.id}
              canWrite={canWrite}
            />
          )}
        </>
      )}

      {canDelete && (
        <div className="border-t border-slate-200 pt-5">
          <p className="mb-2 text-sm font-medium text-slate-700">Șterge factura</p>
          <p className="mb-3 text-sm text-slate-500">
            {isDraft
              ? "Ciorna va fi ștearsă definitiv."
              : "Ștergerea unei facturi emise afectează numerotarea fiscală — folosește „Anulează factura” în locul ștergerii ori de câte ori e posibil."}
          </p>
          <DeleteButton action={deleteInvoiceAction.bind(null, invoice.id)} label="Șterge factura" />
        </div>
      )}
    </div>
  );
}

async function DraftEditor({
  invoice,
  supabase,
  organizationId,
  defaultCurrency,
}: {
  invoice: Awaited<ReturnType<typeof getInvoiceWithLines>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  organizationId: string;
  defaultCurrency: string;
}) {
  const [clients, projects, catalog, series] = await Promise.all([
    listClientOptions(supabase, organizationId),
    listProjectOptions(supabase, organizationId),
    listItemOptions(supabase, organizationId),
    listInvoiceSeries(supabase, organizationId),
  ]);
  return (
    <InvoiceForm
      invoice={invoice ?? undefined}
      clients={clients}
      projects={projects}
      catalog={catalog}
      series={series}
      defaultSeriesId={series[0]?.id ?? ""}
      defaultCurrency={defaultCurrency}
    />
  );
}

async function PrintPreview({
  invoice,
  supabase,
  organizationId,
  clientId,
}: {
  invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceWithLines>>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  organizationId: string;
  clientId: string;
}) {
  const [client, org] = await Promise.all([
    getClient(supabase, organizationId, clientId),
    getOrganizationBillingInfo(supabase, organizationId),
  ]);
  if (!org) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <InvoiceDocument invoice={invoice} client={client} org={org} />
    </div>
  );
}

async function EInvoiceBlock({
  invoiceId,
  supabase,
  organizationId,
  canWrite,
}: {
  invoiceId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  organizationId: string;
  canWrite: boolean;
}) {
  const [prepared, submission] = await Promise.all([
    prepareEInvoice(supabase, organizationId, invoiceId),
    getLatestSubmission(supabase, organizationId, invoiceId),
  ]);

  return (
    <EInvoicePanel
      invoiceId={invoiceId}
      canWrite={canWrite}
      countrySupported={prepared.ok}
      validation={prepared.ok ? prepared.validation : null}
      submission={submission}
      providerConfigured={prepared.ok ? !!prepared.provider?.isConfigured : false}
    />
  );
}

async function InvoicePayments({
  invoiceId,
  total,
  currency,
  supabase,
  organizationId,
  canWrite,
  canDelete,
}: {
  invoiceId: string;
  total: number;
  currency: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  organizationId: string;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const payments = await listPaymentsForInvoice(supabase, organizationId, invoiceId);
  return (
    <PaymentsSection
      payments={payments}
      currency={currency}
      totalDue={total}
      addHref={`/payments/new?invoice=${invoiceId}`}
      canWrite={canWrite}
      canDelete={canDelete}
      labelIn="Încasări"
    />
  );
}
