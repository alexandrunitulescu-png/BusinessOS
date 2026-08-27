import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { listDocuments, PAGE_SIZE } from "@/lib/documents/queries";
import {
  DOCUMENT_ENTITY_TYPES,
  DOCUMENT_ENTITY_LABELS,
  type DocumentEntityType,
} from "@/lib/documents/schemas";
import { deleteDocumentAction } from "@/lib/documents/mutations";
import { formatBytes } from "@/lib/documents/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { Icon } from "@/components/shell/icons";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Documente · BusinessOS" };

function isType(v: string | undefined): v is DocumentEntityType {
  return !!v && (DOCUMENT_ENTITY_TYPES as readonly string[]).includes(v);
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("catalog", "read", "DOCUMENTS");
  const { type: typeParam, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const entityType = isType(typeParam) ? typeParam : undefined;
  const canWrite = hasPermission(membership.role, "catalog", "write");
  const canDelete = hasPermission(membership.role, "catalog", "delete");

  const { documents, total } = await listDocuments(supabase, membership.id, {
    entityType,
    page,
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Documente"
        description="Toate fișierele atașate din cont. Atașează pe o entitate din pagina ei."
        action={
          canWrite ? (
            <DocumentUpload organizationId={membership.id} entityType="OTHER" />
          ) : undefined
        }
      />

      <form className="flex flex-wrap items-center gap-2">
        <select
          name="type"
          defaultValue={entityType ?? ""}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        >
          <option value="">Toate tipurile</option>
          {DOCUMENT_ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {DOCUMENT_ENTITY_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Filtrează
        </button>
      </form>

      {documents.length === 0 ? (
        <EmptyState
          icon="paperclip"
          title={entityType ? "Niciun document de acest tip" : "Niciun document încă"}
          description="Încarcă un fișier PDF sau imagine (max 10 MB)."
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Fișier</TH>
                <TH>Legat de</TH>
                <TH>Mărime</TH>
                <TH>Adăugat</TH>
                <TH className="text-right" />
              </tr>
            </THead>
            <TBody>
              {documents.map((doc) => (
                <TR key={doc.id}>
                  <TD className="font-medium text-slate-900">
                    <a
                      href={`/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-2 hover:underline"
                    >
                      <Icon name="paperclip" className="h-4 w-4 text-slate-400" />
                      {doc.filename}
                    </a>
                  </TD>
                  <TD>
                    <Badge>{DOCUMENT_ENTITY_LABELS[doc.entityType]}</Badge>
                  </TD>
                  <TD>{formatBytes(doc.sizeBytes)}</TD>
                  <TD>{formatDate(doc.createdAt)}</TD>
                  <TD className="text-right">
                    {canDelete && (
                      <DeleteButton
                        action={deleteDocumentAction.bind(null, doc.id)}
                        label="Șterge"
                        confirmLabel="Confirmă"
                      />
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath="/documents"
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            params={{ type: entityType }}
          />
        </>
      )}
    </div>
  );
}
