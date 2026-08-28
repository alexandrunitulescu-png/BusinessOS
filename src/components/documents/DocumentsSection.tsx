import type { DocumentRecord } from "@/lib/documents/types";
import { formatBytes } from "@/lib/documents/types";
import type { DocumentEntityType } from "@/lib/documents/schemas";
import { deleteDocumentAction } from "@/lib/documents/mutations";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { Icon } from "@/components/shell/icons";
import { formatDate } from "@/lib/format";

export function DocumentsSection({
  documents,
  organizationId,
  entityType,
  entityId,
  canWrite,
  canDelete,
}: {
  documents: DocumentRecord[];
  organizationId: string;
  entityType: DocumentEntityType;
  entityId?: string;
  canWrite: boolean;
  canDelete: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">Documente</h2>
        {canWrite && (
          <DocumentUpload
            organizationId={organizationId}
            entityType={entityType}
            entityId={entityId}
          />
        )}
      </div>

      {documents.length === 0 ? (
        <p className="mt-3 text-sm text-text-subtle">Niciun document atașat.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
            >
              <a
                href={`/documents/${doc.id}/download`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 font-medium text-text hover:underline"
              >
                <Icon name="paperclip" className="h-4 w-4 text-text-subtle" />
                {doc.filename}
              </a>
              <span className="flex items-center gap-3 text-text-subtle">
                <span>
                  {formatBytes(doc.sizeBytes)} · {formatDate(doc.createdAt)}
                </span>
                {canDelete && (
                  <DeleteButton
                    action={deleteDocumentAction.bind(null, doc.id)}
                    label="Șterge"
                    confirmLabel="Confirmă"
                  />
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
