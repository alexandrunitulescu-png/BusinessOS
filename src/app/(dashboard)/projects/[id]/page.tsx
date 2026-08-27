import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getProject } from "@/lib/projects/queries";
import { deleteProjectAction } from "@/lib/projects/mutations";
import { listClientOptions } from "@/lib/crm/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { EntityDocuments } from "@/components/documents/EntityDocuments";

export const metadata: Metadata = { title: "Proiect · BusinessOS" };

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("business", "read", "PROJECTS");
  const { id } = await params;

  const [project, clients] = await Promise.all([
    getProject(supabase, membership.id, id),
    listClientOptions(supabase, membership.id),
  ]);
  if (!project) notFound();

  const canWrite = hasPermission(membership.role, "business", "write");
  const canDelete = hasPermission(membership.role, "business", "delete");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={project.name}
        description={canWrite ? "Editează proiectul." : "Detalii proiect."}
      />
      <ProjectForm
        project={project}
        clients={clients}
        defaultCurrency={membership.defaultCurrency}
        readOnly={!canWrite}
      />

      <EntityDocuments
        supabase={supabase}
        organizationId={membership.id}
        role={membership.role}
        entityType="PROJECT"
        entityId={project.id}
      />

      {canDelete && (
        <div className="border-t border-slate-200 pt-5">
          <p className="mb-2 text-sm font-medium text-slate-700">Șterge proiectul</p>
          <p className="mb-3 text-sm text-slate-500">
            Acțiunea este permanentă. Facturile legate de acest proiect rămân, dar pierd legătura.
          </p>
          <DeleteButton
            action={deleteProjectAction.bind(null, project.id)}
            label="Șterge proiectul"
          />
        </div>
      )}
    </div>
  );
}
