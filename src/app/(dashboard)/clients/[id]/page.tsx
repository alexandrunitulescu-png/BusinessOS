import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getClient } from "@/lib/crm/queries";
import { deleteClientAction } from "@/lib/crm/mutations";
import { partyDisplayName } from "@/lib/crm/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClientForm } from "@/components/crm/ClientForm";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { EntityDocuments } from "@/components/documents/EntityDocuments";

export const metadata: Metadata = { title: "Client · BusinessOS" };

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("business");
  const { id } = await params;
  const client = await getClient(supabase, membership.id, id);
  if (!client) notFound();

  const canWrite = hasPermission(membership.role, "business", "write");
  const canDelete = hasPermission(membership.role, "business", "delete");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={partyDisplayName(client)}
        description={canWrite ? "Editează datele clientului." : "Datele clientului."}
      />
      <ClientForm client={client} readOnly={!canWrite} />

      <EntityDocuments
        supabase={supabase}
        organizationId={membership.id}
        role={membership.role}
        entityType="CLIENT"
        entityId={client.id}
      />

      {canDelete && (
        <div className="border-t border-slate-200 pt-5">
          <p className="mb-2 text-sm font-medium text-slate-700">Șterge clientul</p>
          <p className="mb-3 text-sm text-slate-500">
            Acțiunea este permanentă. Facturile deja emise către acest client rămân neschimbate.
          </p>
          <DeleteButton action={deleteClientAction.bind(null, client.id)} label="Șterge clientul" />
        </div>
      )}
    </div>
  );
}
