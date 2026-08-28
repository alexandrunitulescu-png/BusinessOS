"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  paymentSchema,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentInput,
  type PaymentTarget,
} from "@/lib/payments/schemas";
import { CURRENCIES } from "@/lib/organizations/schemas";
import { createPaymentAction } from "@/lib/payments/mutations";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";

type TargetOption = { id: string; label: string; currency: string; remaining: number };

export function PaymentForm({
  invoices,
  expenses,
  fixed,
  defaultCurrency,
}: {
  invoices: TargetOption[];
  expenses: TargetOption[];
  /** Pre-selected target when the form is opened from an invoice/expense page. */
  fixed?: { type: PaymentTarget; option: TargetOption };
  defaultCurrency: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initialType: PaymentTarget = fixed?.type ?? "INVOICE";
  const initialTarget = fixed?.option;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      targetType: initialType,
      targetId: initialTarget?.id ?? "",
      amount: initialTarget?.remaining ?? 0,
      currency: (initialTarget?.currency ?? defaultCurrency) as PaymentInput["currency"],
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "BANK_TRANSFER",
      reference: "",
      notes: "",
    },
  });

  const targetType = watch("targetType");
  const targetId = watch("targetId");

  const options = targetType === "INVOICE" ? invoices : expenses;
  const selected = useMemo(
    () => (fixed ? fixed.option : options.find((o) => o.id === targetId)),
    [fixed, options, targetId],
  );

  function onTargetChange(id: string) {
    setValue("targetId", id);
    const opt = options.find((o) => o.id === id);
    if (opt) {
      setValue("amount", opt.remaining);
      setValue("currency", opt.currency as PaymentInput["currency"]);
    }
  }

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createPaymentAction(data);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {!fixed && (
        <div className="flex gap-2">
          {(["INVOICE", "EXPENSE"] as const).map((t) => (
            <label
              key={t}
              className="flex-1 cursor-pointer rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
            >
              <input
                type="radio"
                name="targetType"
                className="mr-2"
                checked={targetType === t}
                onChange={() => {
                  setValue("targetType", t);
                  setValue("targetId", "");
                  setValue("amount", 0);
                }}
              />
              {t === "INVOICE" ? "Încasare factură" : "Plată cheltuială"}
            </label>
          ))}
        </div>
      )}
      <input type="hidden" {...register("targetType")} />

      <Field
        label={targetType === "INVOICE" ? "Factură" : "Cheltuială"}
        required
        error={errors.targetId?.message}
      >
        {fixed ? (
          <Input readOnly value={fixed.option.label} />
        ) : (
          <Select value={targetId} onChange={(e) => onTargetChange(e.target.value)}>
            <option value="">
              {options.length === 0
                ? targetType === "INVOICE"
                  ? "Nicio factură cu sold"
                  : "Nicio cheltuială neplătită"
                : "Alege…"}
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} — rest {formatMoney(o.remaining, o.currency)}
              </option>
            ))}
          </Select>
        )}
        <input type="hidden" {...register("targetId")} />
      </Field>

      {selected && (
        <p className="-mt-2 text-xs text-text-muted">
          Sold rămas: {formatMoney(selected.remaining, selected.currency)}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sumă" required error={errors.amount?.message}>
          <Input type="number" step="0.01" min={0} {...register("amount", { valueAsNumber: true })} />
        </Field>
        <Field label="Monedă" required error={errors.currency?.message}>
          <Select {...register("currency")}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Data plății" required error={errors.paymentDate?.message}>
          <Input type="date" {...register("paymentDate")} />
        </Field>
        <Field label="Metodă" required error={errors.paymentMethod?.message}>
          <Select {...register("paymentMethod")}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Referință" error={errors.reference?.message}>
        <Input {...register("reference")} placeholder="nr. OP, chitanță…" />
      </Field>
      <Field label="Note" error={errors.notes?.message}>
        <Textarea {...register("notes")} />
      </Field>

      {serverError && <p className="text-sm text-critical">{serverError}</p>}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Se salvează…" : "Înregistrează plata"}
        </Button>
        <ButtonLink
          href={
            fixed
              ? fixed.type === "INVOICE"
                ? `/invoices/${fixed.option.id}`
                : `/expenses/${fixed.option.id}`
              : "/payments"
          }
          variant="ghost"
        >
          Anulează
        </ButtonLink>
      </div>
    </form>
  );
}
