import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClientForm } from "@/components/crm/ClientForm";

export const metadata: Metadata = { title: "Client nou · BusinessOS" };

export default async function NewClientPage() {
  await requirePageAccess("business", "write");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Client nou" description="Adaugă o companie sau o persoană fizică." />
      <ClientForm />
    </div>
  );
}
