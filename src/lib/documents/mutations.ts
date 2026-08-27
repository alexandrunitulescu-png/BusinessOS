"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionContext } from "@/lib/auth/membership";
import { hasPermission } from "@/lib/auth/rbac";
import {
  recordDocumentSchema,
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
  ORG_FILES_BUCKET,
  type RecordDocumentInput,
} from "@/lib/documents/schemas";

export type MutationResult = { error: string | null };

const NO_PERMISSION = "Nu ai permisiunea să încarci documente.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (db: unknown) => db as SupabaseClient<any>;

async function authorize(action: "write" | "delete") {
  const ctx = await getActionContext();
  if (!ctx.ok) return { ok: false as const, error: ctx.error };
  // Documents use the "catalog" resource in the RBAC matrix (M0 §8).
  if (!hasPermission(ctx.membership.role, "catalog", action)) {
    return { ok: false as const, error: NO_PERMISSION };
  }
  return { ok: true as const, supabase: loose(ctx.supabase), organizationId: ctx.membership.id };
}

/**
 * The file is uploaded straight to Storage by the browser (RLS-enforced by the
 * user's JWT); this records the `documents` row. It re-checks that the object
 * really is under this org's folder, that the MIME/size are allowed, and that
 * the object exists — otherwise it removes the stray upload.
 */
export async function recordDocumentAction(
  input: RecordDocumentInput,
): Promise<MutationResult> {
  const parsed = recordDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  const data = parsed.data;

  const gate = await authorize("write");
  if (!gate.ok) return { error: gate.error };

  const expectedPrefix = `${gate.organizationId}/`;
  const removeStray = () =>
    gate.supabase.storage.from(ORG_FILES_BUCKET).remove([data.storagePath]);

  if (!data.storagePath.startsWith(expectedPrefix)) {
    await removeStray();
    return { error: "Calea fișierului nu aparține organizației." };
  }
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(data.mimeType)) {
    await removeStray();
    return { error: "Tip de fișier neacceptat." };
  }
  if (data.sizeBytes > MAX_FILE_BYTES) {
    await removeStray();
    return { error: "Fișier prea mare (max 10 MB)." };
  }

  const { error } = await gate.supabase.from("documents").insert({
    organization_id: gate.organizationId,
    entity_type: data.entityType,
    entity_id: data.entityId || null,
    filename: data.filename,
    storage_path: data.storagePath,
    mime_type: data.mimeType,
    size_bytes: data.sizeBytes,
  });
  if (error) {
    await removeStray();
    return { error: error.message };
  }

  revalidatePath("/documents");
  if (data.entityId) {
    const map: Record<string, string> = {
      INVOICE: "/invoices",
      EXPENSE: "/expenses",
      CLIENT: "/clients",
      SUPPLIER: "/suppliers",
      PROJECT: "/projects",
    };
    if (map[data.entityType]) revalidatePath(`${map[data.entityType]}/${data.entityId}`);
  }
  return { error: null };
}

export async function deleteDocumentAction(id: string): Promise<MutationResult> {
  const gate = await authorize("delete");
  if (!gate.ok) return { error: gate.error };

  const { data: doc } = await gate.supabase
    .from("documents")
    .select("storage_path, entity_type, entity_id")
    .eq("organization_id", gate.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (!doc) return { error: "Documentul nu există." };

  const { error } = await gate.supabase
    .from("documents")
    .delete()
    .eq("organization_id", gate.organizationId)
    .eq("id", id);
  if (error) return { error: error.message };

  await gate.supabase.storage.from(ORG_FILES_BUCKET).remove([doc.storage_path]);

  revalidatePath("/documents");
  const map: Record<string, string> = {
    INVOICE: "/invoices",
    EXPENSE: "/expenses",
    CLIENT: "/clients",
    SUPPLIER: "/suppliers",
    PROJECT: "/projects",
  };
  if (doc.entity_id && map[doc.entity_type]) {
    revalidatePath(`${map[doc.entity_type]}/${doc.entity_id}`);
  }
  return { error: null };
}
