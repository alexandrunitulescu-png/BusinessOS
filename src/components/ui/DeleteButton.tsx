"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Two-step delete: the first click arms a confirm/cancel pair, so there's no
 * accidental destructive action and no blocking `window.confirm`.
 */
export function DeleteButton({
  action,
  confirmLabel = "Confirmă ștergerea",
  label = "Șterge",
}: {
  action: () => Promise<{ error: string | null }>;
  confirmLabel?: string;
  label?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!armed) {
    return (
      <Button type="button" variant="secondary" onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="danger"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await action();
            if (result?.error) setError(result.error);
            // On success the action redirects.
          });
        }}
      >
        {isPending ? "Se șterge…" : confirmLabel}
      </Button>
      <Button type="button" variant="ghost" disabled={isPending} onClick={() => setArmed(false)}>
        Renunță
      </Button>
      {error && <span className="text-sm text-critical">{error}</span>}
    </div>
  );
}
