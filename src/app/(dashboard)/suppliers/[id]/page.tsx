import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getSupplier } from "@/lib/crm/queries";
import { deleteSupplierAction } from "@/lib/crm/mutations";
import { PageHeader } from "@/components/ui/PageHeader";
import { SupplierForm } from "@/components/crm/SupplierForm";
import { DeleteButton } from "@/components/ui/DeleteButton";

export const metadata: Metadata = { title: "Furnizor · BusinessOS" };

export default async function SupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("business");
  const { id } = await params;
  const supplier = await getSupplier(supabase, membership.id, id);
  if (!supplier) notFound();

  const canWrite = hasPermission(membership.role, "business", "write");
  const canDelete = hasPermission(membership.role, "business", "delete");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={supplier.companyName}
        description={canWrite ? "Editează datele furnizorului." : "Datele furnizorului."}
      />
      <SupplierForm supplier={supplier} readOnly={!canWrite} />

      {canDelete && (
        <div className="border-t border-slate-200 pt-5">
          <p className="mb-2 text-sm font-medium text-slate-700">Șterge furnizorul</p>
          <p className="mb-3 text-sm text-slate-500">
            Acțiunea este permanentă. Cheltuielile deja înregistrate rămân neschimbate.
          </p>
          <DeleteButton
            action={deleteSupplierAction.bind(null, supplier.id)}
            label="Șterge furnizorul"
          />
        </div>
      )}
    </div>
  );
}
