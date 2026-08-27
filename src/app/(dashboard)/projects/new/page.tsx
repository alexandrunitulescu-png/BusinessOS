import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { listClientOptions } from "@/lib/crm/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectForm } from "@/components/projects/ProjectForm";

export const metadata: Metadata = { title: "Proiect nou · BusinessOS" };

export default async function NewProjectPage() {
  const { supabase, membership } = await requirePageAccess("business", "write");
  const clients = await listClientOptions(supabase, membership.id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Proiect nou" description="Creează un proiect și leagă-l opțional de un client." />
      <ProjectForm clients={clients} defaultCurrency={membership.defaultCurrency} />
    </div>
  );
}
