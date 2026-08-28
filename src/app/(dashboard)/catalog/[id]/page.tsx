import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getItem } from "@/lib/catalog/queries";
import { deleteItemAction } from "@/lib/catalog/mutations";
import { PageHeader } from "@/components/ui/PageHeader";
import { ItemForm } from "@/components/catalog/ItemForm";
import { DeleteButton } from "@/components/ui/DeleteButton";

export const metadata: Metadata = { title: "Articol · BusinessPuls" };

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("catalog", "read", "CRM");
  const { id } = await params;
  const item = await getItem(supabase, membership.id, id);
  if (!item) notFound();

  const canWrite = hasPermission(membership.role, "catalog", "write");
  const canDelete = hasPermission(membership.role, "catalog", "delete");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={item.name}
        description={canWrite ? "Editează produsul sau serviciul." : "Detalii produs / serviciu."}
      />
      <ItemForm item={item} defaultCurrency={membership.defaultCurrency} readOnly={!canWrite} />

      {canDelete && (
        <div className="border-t border-border pt-5">
          <p className="mb-2 text-sm font-medium text-text">Șterge articolul</p>
          <p className="mb-3 text-sm text-text-muted">
            Acțiunea este permanentă. Facturile care folosesc deja acest articol rămân neschimbate.
          </p>
          <DeleteButton action={deleteItemAction.bind(null, item.id)} label="Șterge articolul" />
        </div>
      )}
    </div>
  );
}
