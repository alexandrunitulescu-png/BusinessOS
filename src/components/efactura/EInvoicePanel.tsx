import type { ValidationResult } from "@/lib/efactura/validator";
import type { EInvoiceSubmission } from "@/lib/efactura/queries";
import { Badge } from "@/components/ui/Badge";
import { EInvoiceActions } from "@/components/efactura/EInvoiceActions";

const SUBMISSION_LABELS: Record<EInvoiceSubmission["status"], string> = {
  NOT_REQUIRED: "Nu e necesară",
  NOT_SENT: "Pregătită, netrimisă",
  QUEUED: "În coadă",
  SUBMITTED: "Trimisă",
  PROCESSING: "În procesare",
  VALIDATED: "Validată de ANAF",
  REJECTED: "Respinsă de ANAF",
};

export function EInvoicePanel({
  invoiceId,
  canWrite,
  validation,
  submission,
  providerConfigured,
  countrySupported,
}: {
  invoiceId: string;
  canWrite: boolean;
  validation: ValidationResult | null;
  submission: EInvoiceSubmission | null;
  providerConfigured: boolean;
  countrySupported: boolean;
}) {
  const errors = validation?.issues.filter((i) => i.severity === "error") ?? [];
  const warnings = validation?.issues.filter((i) => i.severity === "warning") ?? [];
  const isPrepared = submission?.status === "NOT_SENT";

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">e-Factura (RO)</h2>
        {submission ? (
          <Badge
            tone={
              submission.status === "VALIDATED"
                ? "green"
                : submission.status === "REJECTED"
                  ? "red"
                  : "blue"
            }
          >
            {SUBMISSION_LABELS[submission.status]}
          </Badge>
        ) : (
          <Badge>Nepregătită</Badge>
        )}
      </div>

      {!countrySupported ? (
        <p className="mt-3 text-sm text-text-muted">
          Organizația nu are o țară cu modul de e-Factura.
        </p>
      ) : (
        <>
          {validation && (
            <div className="mt-3 text-sm">
              {validation.valid ? (
                <p className="text-positive">
                  ✓ Factura trece validarea locală și XML-ul UBL poate fi generat.
                </p>
              ) : (
                <p className="text-critical">
                  Factura nu trece validarea pentru e-Factura:
                </p>
              )}
              {errors.length > 0 && (
                <ul className="mt-1.5 list-disc pl-5 text-critical">
                  {errors.map((issue, i) => (
                    <li key={i}>{issue.message}</li>
                  ))}
                </ul>
              )}
              {warnings.length > 0 && (
                <ul className="mt-1.5 list-disc pl-5 text-warning">
                  {warnings.map((issue, i) => (
                    <li key={i}>{issue.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {canWrite && (
            <div className="mt-4">
              <EInvoiceActions
                invoiceId={invoiceId}
                canPrepare={!!validation?.valid}
                isPrepared={isPrepared}
                providerConfigured={providerConfigured}
              />
            </div>
          )}

          <p className="mt-4 text-xs text-text-subtle">
            Trimiterea electronică către ANAF se activează după configurarea conexiunii pe baza
            documentației oficiale. Până atunci poți descărca XML-ul UBL și îl încarci manual în SPV.
          </p>
        </>
      )}
    </section>
  );
}
