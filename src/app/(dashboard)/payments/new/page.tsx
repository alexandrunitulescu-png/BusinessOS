import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth/session";
import {
  getInvoiceWithLines,
  listOpenInvoiceOptions,
} from "@/lib/invoicing/queries";
import { getExpense, listOpenExpenseOptions } from "@/lib/expenses/queries";
import {
  listPaymentsForExpense,
  listPaymentsForInvoice,
} from "@/lib/payments/queries";
import { invoiceNumberLabel } from "@/lib/invoicing/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentForm } from "@/components/payments/PaymentForm";

export const metadata: Metadata = { title: "Plată nouă · BusinessOS" };

const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string; expense?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("money", "write");
  const { invoice: invoiceId, expense: expenseId } = await searchParams;

  if (invoiceId) {
    const invoice = await getInvoiceWithLines(supabase, membership.id, invoiceId);
    if (!invoice) notFound();
    const paid = sum(await listPaymentsForInvoice(supabase, membership.id, invoiceId));
    const option = {
      id: invoice.id,
      label: `Factura ${invoiceNumberLabel(invoice)}`,
      currency: invoice.currency,
      remaining: Math.max(invoice.total - paid, 0),
    };
    return (
      <Wrap title="Încasare factură">
        <PaymentForm
          invoices={[]}
          expenses={[]}
          fixed={{ type: "INVOICE", option }}
          defaultCurrency={membership.defaultCurrency}
        />
      </Wrap>
    );
  }

  if (expenseId) {
    const expense = await getExpense(supabase, membership.id, expenseId);
    if (!expense) notFound();
    const paid = sum(await listPaymentsForExpense(supabase, membership.id, expenseId));
    const option = {
      id: expense.id,
      label: expense.description || expense.category || "Cheltuială",
      currency: expense.currency,
      remaining: Math.max(expense.amount - paid, 0),
    };
    return (
      <Wrap title="Plată cheltuială">
        <PaymentForm
          invoices={[]}
          expenses={[]}
          fixed={{ type: "EXPENSE", option }}
          defaultCurrency={membership.defaultCurrency}
        />
      </Wrap>
    );
  }

  const [invoices, expenses] = await Promise.all([
    listOpenInvoiceOptions(supabase, membership.id),
    listOpenExpenseOptions(supabase, membership.id),
  ]);

  return (
    <Wrap title="Plată nouă">
      <PaymentForm
        invoices={invoices}
        expenses={expenses}
        defaultCurrency={membership.defaultCurrency}
      />
    </Wrap>
  );
}

function Wrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={title} description="Se reconciliază automat cu factura sau cheltuiala." />
      {children}
    </div>
  );
}
