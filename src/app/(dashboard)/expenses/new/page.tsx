import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { listSupplierOptions } from "@/lib/crm/queries";
import { listProjectOptions } from "@/lib/projects/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";

export const metadata: Metadata = { title: "Cheltuială nouă · BusinessPuls" };

export default async function NewExpensePage() {
  const { supabase, membership } = await requirePageAccess("money", "write", "EXPENSES");

  const [suppliers, projects] = await Promise.all([
    listSupplierOptions(supabase, membership.id),
    listProjectOptions(supabase, membership.id),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Cheltuială nouă" description="Suma include TVA-ul; separă cât e TVA." />
      <ExpenseForm
        suppliers={suppliers}
        projects={projects}
        defaultCurrency={membership.defaultCurrency}
      />
    </div>
  );
}
