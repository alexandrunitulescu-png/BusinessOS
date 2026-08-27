"use client";

import { useState, useTransition } from "react";
import {
  INVOICE_STATUS_LABELS,
  MANUAL_STATUS_TRANSITIONS,
  type InvoiceStatus,
} from "@/lib/invoicing/schemas";
import { issueInvoiceAction, setInvoiceStatusAction } from "@/lib/invoicing/mutations";
import { Button } from "@/components/ui/Button";

export function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setError(result.error);
    });
  }

  const transitions = MANUAL_STATUS_TRANSITIONS[status] ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === "DRAFT" &&
          (confirmIssue ? (
            <>
              <Button
                variant="primary"
                disabled={isPending}
                onClick={() => run(() => issueInvoiceAction(invoiceId))}
              >
                {isPending ? "Se emite…" : "Confirmă emiterea"}
              </Button>
              <Button variant="ghost" disabled={isPending} onClick={() => setConfirmIssue(false)}>
                Renunță
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setConfirmIssue(true)}>
              Emite factura
            </Button>
          ))}

        {transitions.map((target) => (
          <Button
            key={target}
            variant={target === "CANCELLED" ? "secondary" : "primary"}
            disabled={isPending}
            onClick={() => run(() => setInvoiceStatusAction(invoiceId, target as InvoiceStatus))}
          >
            {target === "CANCELLED"
              ? "Anulează factura"
              : `Marchează ${INVOICE_STATUS_LABELS[target as InvoiceStatus].toLowerCase()}`}
          </Button>
        ))}
      </div>

      {status === "DRAFT" && confirmIssue && (
        <p className="text-xs text-slate-500">
          După emitere, factura primește un număr definitiv și nu mai poate fi modificată.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
