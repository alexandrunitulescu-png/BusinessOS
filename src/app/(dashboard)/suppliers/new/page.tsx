import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { SupplierForm } from "@/components/crm/SupplierForm";

export const metadata: Metadata = { title: "Furnizor nou · BusinessOS" };

export default async function NewSupplierPage() {
  await requirePageAccess("business", "write", "CRM");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Furnizor nou" description="Adaugă o companie sau o persoană fizică." />
      <SupplierForm />
    </div>
  );
}
