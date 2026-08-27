"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  onboardingSchema,
  ENTITY_TYPES,
  CURRENCIES,
  STEP_FIELDS,
  TOTAL_STEPS,
  type OnboardingInput,
} from "@/lib/organizations/schemas";
import { createOrganizationAction } from "@/lib/organizations/mutations";

const ENTITY_LABELS: Record<(typeof ENTITY_TYPES)[number], string> = {
  PFA: "PFA — Persoană Fizică Autorizată",
  II: "II — Întreprindere Individuală",
  IF: "IF — Întreprindere Familială",
  SRL: "SRL",
  SA: "SA",
  LIBERAL_PROFESSION: "Profesie liberală",
  OTHER: "Altceva",
};

const STEP_TITLES = [
  "Ce fel de companie ai?",
  "Datele companiei",
  "Facturare",
  "Cont bancar",
  "Gata de pornire",
];

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      entityType: "PFA",
      vatRegistered: false,
      defaultCurrency: "RON",
      invoiceSeries: "FCT",
      invoiceNextNumber: 1,
    },
  });

  const { register, handleSubmit, trigger, watch, formState } = form;
  const vatRegistered = watch("vatRegistered");

  async function goNext() {
    const fields = STEP_FIELDS[step] ?? [];
    const valid = await trigger(fields);
    if (valid) setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createOrganizationAction(data);
      if (result.error) setServerError(result.error);
      // On success the action redirects; nothing else to do here.
    });
  });

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              s <= step ? "bg-slate-900" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <h1 className="mb-6 text-lg font-semibold text-slate-900">{STEP_TITLES[step - 1]}</h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {step === 1 && (
          <div className="grid grid-cols-1 gap-2">
            {ENTITY_TYPES.map((type) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50"
              >
                <input type="radio" value={type} {...register("entityType")} />
                {ENTITY_LABELS[type]}
              </label>
            ))}
          </div>
        )}

        {step === 2 && (
          <>
            <Field label="Denumire legală" error={formState.errors.legalName?.message}>
              <input {...register("legalName")} className={inputClass} />
            </Field>
            <Field label="Denumire comercială (opțional)">
              <input {...register("tradeName")} className={inputClass} />
            </Field>
            <Field label="CUI" error={formState.errors.cui?.message}>
              <input {...register("cui")} className={inputClass} />
            </Field>
            <Field label="Nr. înregistrare (opțional)">
              <input {...register("registrationNumber")} className={inputClass} />
            </Field>
            <Field label="Adresă" error={formState.errors.addressLine?.message}>
              <input {...register("addressLine")} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Oraș" error={formState.errors.city?.message}>
                <input {...register("city")} className={inputClass} />
              </Field>
              <Field label="Județ" error={formState.errors.county?.message}>
                <input {...register("county")} className={inputClass} />
              </Field>
            </div>
            <Field label="Cod poștal (opțional)">
              <input {...register("postalCode")} className={inputClass} />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("vatRegistered")} />
              Plătitor de TVA
            </label>
            {vatRegistered && (
              <Field label="Cod TVA" error={formState.errors.vatCode?.message}>
                <input {...register("vatCode")} className={inputClass} />
              </Field>
            )}
            <Field label="Monedă implicită">
              <select {...register("defaultCurrency")} className={inputClass}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Serie factură" error={formState.errors.invoiceSeries?.message}>
                <input {...register("invoiceSeries")} className={inputClass} />
              </Field>
              <Field
                label="Primul număr"
                error={formState.errors.invoiceNextNumber?.message}
              >
                <input
                  type="number"
                  min={1}
                  {...register("invoiceNextNumber", { valueAsNumber: true })}
                  className={inputClass}
                />
              </Field>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <Field label="IBAN (opțional)">
              <input {...register("iban")} className={inputClass} />
            </Field>
            <Field label="Bancă (opțional)">
              <input {...register("bankName")} className={inputClass} />
            </Field>
          </>
        )}

        {step === 5 && (
          <p className="text-sm text-slate-600">
            BusinessOS este pregătit. Apasă „Finalizează” ca să intri în cont.
          </p>
        )}

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <div className="mt-2 flex justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Înapoi
            </button>
          ) : (
            <span />
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Continuă
            </button>
          ) : (
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isPending ? "Se creează…" : "Finalizează"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
