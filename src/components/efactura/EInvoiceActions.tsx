"use client";

import { useState, useTransition } from "react";
import { prepareEInvoiceAction, resetEInvoiceAction } from "@/lib/efactura/mutations";
import { Button } from "@/components/ui/Button";

export function EInvoiceActions({
  invoiceId,
  canPrepare,
  isPrepared,
  providerConfigured,
}: {
  invoiceId: string;
  canPrepare: boolean;
  isPrepared: boolean;
  providerConfigured: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!isPrepared && (
          <Button
            variant="primary"
            disabled={isPending || !canPrepare}
            onClick={() => run(() => prepareEInvoiceAction(invoiceId))}
          >
            {isPending ? "Se pregătește…" : "Pregătește e-Factura"}
          </Button>
        )}

        <a
          href={`/invoices/${invoiceId}/einvoice-xml`}
          className="inline-flex items-center rounded-md border border-border-strong bg-surface-raised px-3.5 py-2 text-sm font-medium text-text hover:bg-surface-sunken"
        >
          Descarcă XML (UBL)
        </a>

        <span title="Se activează după configurarea conexiunii ANAF">
          <Button variant="secondary" disabled>
            {providerConfigured ? "Trimite la ANAF" : "Trimite la ANAF (neconfigurat)"}
          </Button>
        </span>

        {isPrepared && (
          <Button
            variant="ghost"
            disabled={isPending}
            onClick={() => run(() => resetEInvoiceAction(invoiceId))}
          >
            Marchează ca nefiind necesară
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}
