import { z } from "zod";

/** Entity a document can hang off (polymorphic — M0 §4). */
export const DOCUMENT_ENTITY_TYPES = [
  "INVOICE",
  "EXPENSE",
  "CLIENT",
  "SUPPLIER",
  "PROJECT",
  "OTHER",
] as const;
export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];

export const DOCUMENT_ENTITY_LABELS: Record<DocumentEntityType, string> = {
  INVOICE: "Factură",
  EXPENSE: "Cheltuială",
  CLIENT: "Client",
  SUPPLIER: "Furnizor",
  PROJECT: "Proiect",
  OTHER: "Altele",
};

/** MIME whitelist (M0 §9). Kept deliberately small for the MVP. */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

/** Per-file size cap for the MVP (plan-based limits come with M9). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Private Storage bucket for all org files (M0 §9). */
export const ORG_FILES_BUCKET = "org-files";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const recordDocumentSchema = z.object({
  storagePath: z.string().trim().min(1),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_FILE_BYTES, "Fișier prea mare (max 10 MB)"),
  entityType: z.enum(DOCUMENT_ENTITY_TYPES),
  entityId: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || UUID_RE.test(v), "Referință invalidă"),
});

export type RecordDocumentInput = z.infer<typeof recordDocumentSchema>;

/** Strips path separators and odd characters from an uploaded filename. */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\]/g, "-")
    .replace(/[^\w.\- ()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200) || "fisier";
}
