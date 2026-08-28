import type { Payment } from "@/lib/payments/types";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments/schemas";
import { deletePaymentAction } from "@/lib/payments/mutations";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { ButtonLink } from "@/components/ui/Button";
import { formatMoney, formatDate } from "@/lib/format";

export function PaymentsSection({
  payments,
  currency,
  totalDue,
  addHref,
  canWrite,
  canDelete,
  labelIn = "Încasări",
}: {
  payments: Payment[];
  currency: string;
  totalDue: number;
  addHref: string;
  canWrite: boolean;
  canDelete: boolean;
  labelIn?: string;
}) {
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(totalDue - paid, 0);

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">{labelIn}</h2>
        {canWrite && remaining > 0.004 && (
          <ButtonLink href={addHref} size="sm">
            Adaugă
          </ButtonLink>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-text-muted">
          Plătit: <span className="font-medium text-text">{formatMoney(paid, currency)}</span>
        </span>
        <span className="text-text-muted">
          Din: <span className="font-medium text-text">{formatMoney(totalDue, currency)}</span>
        </span>
        <span className="text-text-muted">
          Rămas:{" "}
          <span className={`font-medium ${remaining > 0.004 ? "text-warning" : "text-positive"}`}>
            {formatMoney(remaining, currency)}
          </span>
        </span>
      </div>

      {payments.length === 0 ? (
        <p className="mt-3 text-sm text-text-subtle">Nicio plată înregistrată.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <div>
                <span className="font-medium text-text tabular-nums">
                  {formatMoney(p.amount, p.currency)}
                </span>
                <span className="ml-2 text-text-muted">
                  {formatDate(p.paymentDate)} · {PAYMENT_METHOD_LABELS[p.paymentMethod]}
                  {p.reference ? ` · ${p.reference}` : ""}
                </span>
              </div>
              {canDelete && (
                <DeleteButton
                  action={deletePaymentAction.bind(null, p.id)}
                  label="Șterge"
                  confirmLabel="Confirmă"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
