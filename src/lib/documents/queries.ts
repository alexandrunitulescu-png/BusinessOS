import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ORG_FILES_BUCKET, type DocumentEntityType } from "@/lib/documents/schemas";
import type { DocumentRecord } from "@/lib/documents/types";

export const PAGE_SIZE = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

function mapDocument(row: Row): DocumentRecord {
  return {
    id: row.id as string,
    entityType: row.entity_type as DocumentEntityType,
    entityId: typeof row.entity_id === "string" ? row.entity_id : null,
    filename: (row.filename as string) ?? "fișier",
    storagePath: row.storage_path as string,
    mimeType: (row.mime_type as string) ?? "application/octet-stream",
    sizeBytes: Number(row.size_bytes ?? 0),
    createdAt: row.created_at as string,
  };
}

export async function listDocumentsForEntity(
  supabase: Db,
  organizationId: string,
  entityType: DocumentEntityType,
  entityId: string,
): Promise<DocumentRecord[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDocument);
}

export async function listDocuments(
  supabase: Db,
  organizationId: string,
  { entityType, page = 1 }: { entityType?: DocumentEntityType; page?: number } = {},
): Promise<{ documents: DocumentRecord[]; total: number }> {
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (entityType) query = query.eq("entity_type", entityType);

  const { data, error, count } = await query;
  if (error) throw error;
  return { documents: (data ?? []).map(mapDocument), total: count ?? 0 };
}

export async function getDocument(
  supabase: Db,
  organizationId: string,
  id: string,
): Promise<DocumentRecord | null> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapDocument(data) : null;
}

/** Short-lived signed URL for a private object (M0 §9 — TTL kept small). */
export async function createDocumentSignedUrl(
  supabase: Db,
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ORG_FILES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
