import type { DocumentEntityType } from "@/lib/documents/schemas";

export type DocumentRecord = {
  id: string;
  entityType: DocumentEntityType;
  entityId: string | null;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
