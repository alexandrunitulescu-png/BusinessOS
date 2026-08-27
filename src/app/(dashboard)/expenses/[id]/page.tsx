import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getExpense } from "@/lib/expenses/queries";
import { deleteExpenseAction } from "@/lib/expenses/mutations";
import { listSupplierOptions } from "@/lib/crm/queries";
import { listProjectOptions } from "@/lib/projects/queries";
import { listPaymentsForExpense } from "@/lib/payments/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { PaymentsSection } from "@/components/payments/PaymentsSection";
import { EntityDocuments } from "@/components/documents/EntityDocuments";

export const metadata: Metadata = { title: "Cheltuială · BusinessPuls" };

export default async function ExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("money", "read", "EXPENSES");
  const { id } = await params;

  const expense = await getExpense(supabase, membership.id, id);
  if (!expense) notFound();

  const canWrite = hasPermission(membership.role, "money", "write");
  const canDelete = hasPermission(membership.role, "money", "delete");

  const [suppliers, projects, payments] = await Promise.all([
    listSupplierOptions(supabase, membership.id),
    listProjectOptions(supabase, membership.id),
    listPaymentsForExpense(supabase, membership.id, id),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={expense.description || expense.category || "Cheltuială"}
        description={canWrite ? "Editează cheltuiala." : "Detalii cheltuială."}
      />

      <ExpenseForm
        expense={expense}
        suppliers={suppliers}
        projects={projects}
        defaultCurrency={membership.defaultCurrency}
        readOnly={!canWrite}
      />

      <PaymentsSection
        payments={payments}
        currency={expense.currency}
        totalDue={expense.amount}
        addHref={`/payments/new?expense=${expense.id}`}
        canWrite={canWrite}
        canDelete={canDelete}
        labelIn="Plăți"
      />

      <EntityDocuments
        supabase={supabase}
        organizationId={membership.id}
        role={membership.role}
        entityType="EXPENSE"
        entityId={expense.id}
      />

      {canDelete && (
        <div className="border-t border-slate-200 pt-5">
          <p className="mb-2 text-sm font-medium text-slate-700">Șterge cheltuiala</p>
          <p className="mb-3 text-sm text-slate-500">
            Plățile asociate sunt șterse odată cu ea.
          </p>
          <DeleteButton
            action={deleteExpenseAction.bind(null, expense.id)}
            label="Șterge cheltuiala"
          />
        </div>
      )}
    </div>
  );
}
