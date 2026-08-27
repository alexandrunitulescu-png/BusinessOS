import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveMembership } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getInvoiceWithLines } from "@/lib/invoicing/queries";
import { getClient } from "@/lib/crm/queries";
import { getOrganizationBillingInfo } from "@/lib/organizations/queries";
import { invoiceNumberLabel } from "@/lib/invoicing/types";
import { InvoiceDocument } from "@/components/invoicing/InvoiceDocument";
import { PrintButton } from "@/components/invoicing/PrintButton";

export const metadata: Metadata = { title: "Factură · BusinessPuls" };

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const { supabase, membership } = await requireActiveMembership();
  if (!hasPermission(membership.role, "money", "read")) notFound();

  const { id } = await params;
  const { auto } = await searchParams;

  const invoice = await getInvoiceWithLines(supabase, membership.id, id);
  if (!invoice) notFound();

  const [client, org] = await Promise.all([
    getClient(supabase, membership.id, invoice.clientId),
    getOrganizationBillingInfo(supabase, membership.id),
  ]);
  if (!org) notFound();

  return (
    <div className="mx-auto max-w-[210mm] px-4">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a href={`/invoices/${invoice.id}`} className="text-sm text-slate-500 hover:text-slate-900">
          ← Înapoi la factură
        </a>
        <PrintButton autoPrint={auto === "1"} />
      </div>
      <InvoiceDocument invoice={invoice} client={client} org={org} />
      <p className="mt-3 text-center text-xs text-slate-400 print:hidden">
        {invoiceNumberLabel(invoice)} · generat din BusinessPuls
      </p>
    </div>
  );
}
