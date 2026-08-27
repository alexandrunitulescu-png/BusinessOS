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
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">{labelIn}</h2>
        {canWrite && remaining > 0.004 && (
          <ButtonLink href={addHref} size="sm">
            Adaugă
          </ButtonLink>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-slate-500">
          Plătit: <span className="font-medium text-slate-900">{formatMoney(paid, currency)}</span>
        </span>
        <span className="text-slate-500">
          Din: <span className="font-medium text-slate-900">{formatMoney(totalDue, currency)}</span>
        </span>
        <span className="text-slate-500">
          Rămas:{" "}
          <span className={`font-medium ${remaining > 0.004 ? "text-amber-600" : "text-emerald-600"}`}>
            {formatMoney(remaining, currency)}
          </span>
        </span>
      </div>

      {payments.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Nicio plată înregistrată.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <div>
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatMoney(p.amount, p.currency)}
                </span>
                <span className="ml-2 text-slate-500">
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
