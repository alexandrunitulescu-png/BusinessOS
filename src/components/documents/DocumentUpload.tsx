"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { recordDocumentAction } from "@/lib/documents/mutations";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
  ORG_FILES_BUCKET,
  sanitizeFilename,
  type DocumentEntityType,
} from "@/lib/documents/schemas";
import { Icon } from "@/components/shell/icons";

export function DocumentUpload({
  organizationId,
  entityType,
  entityId,
}: {
  organizationId: string;
  entityType: DocumentEntityType;
  entityId?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();

  async function onFile(file: File) {
    setError(null);

    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Doar PDF, JPG, PNG sau WEBP.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Fișier prea mare (max 10 MB).");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const safeName = sanitizeFilename(file.name);
      const path = `${organizationId}/${entityType}/${entityId ?? "none"}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from(ORG_FILES_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadErr) {
        setError("Încărcarea a eșuat: " + uploadErr.message);
        return;
      }

      const result = await recordDocumentAction({
        storagePath: path,
        filename: safeName,
        mimeType: file.type as (typeof ALLOWED_MIME_TYPES)[number],
        sizeBytes: file.size,
        entityType,
        entityId,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
      startTransition(() => router.refresh());
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-sunken">
        <Icon name="plus" className="h-4 w-4" />
        {uploading ? "Se încarcă…" : "Încarcă document"}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_EXTENSIONS.join(",")}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </label>
      {error && <p className="mt-1.5 text-xs text-critical">{error}</p>}
    </div>
  );
}
