import type { SupabaseClient } from "@supabase/supabase-js";
import { listDocumentsForEntity } from "@/lib/documents/queries";
import { hasPermission, type OrganizationRole } from "@/lib/auth/rbac";
import type { DocumentEntityType } from "@/lib/documents/schemas";
import { DocumentsSection } from "@/components/documents/DocumentsSection";

/** Fetches an entity's attached documents and renders the section. */
export async function EntityDocuments({
  supabase,
  organizationId,
  role,
  entityType,
  entityId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>;
  organizationId: string;
  role: OrganizationRole;
  entityType: DocumentEntityType;
  entityId: string;
}) {
  const documents = await listDocumentsForEntity(
    supabase,
    organizationId,
    entityType,
    entityId,
  );

  return (
    <DocumentsSection
      documents={documents}
      organizationId={organizationId}
      entityType={entityType}
      entityId={entityId}
      canWrite={hasPermission(role, "catalog", "write")}
      canDelete={hasPermission(role, "catalog", "delete")}
    />
  );
}
