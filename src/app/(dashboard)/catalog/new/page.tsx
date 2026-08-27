import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ItemForm } from "@/components/catalog/ItemForm";

export const metadata: Metadata = { title: "Articol nou · BusinessOS" };

export default async function NewItemPage() {
  const { membership } = await requirePageAccess("catalog", "write");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Articol nou" description="Adaugă un produs sau un serviciu în catalog." />
      <ItemForm defaultCurrency={membership.defaultCurrency} />
    </div>
  );
}
