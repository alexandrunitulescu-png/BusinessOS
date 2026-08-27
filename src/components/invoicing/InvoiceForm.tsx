"use client";

import { forwardRef, useMemo, useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceDraftSchema, type InvoiceDraftInput } from "@/lib/invoicing/schemas";
import { computeInvoice } from "@/lib/invoicing/calculations";
import { CURRENCIES } from "@/lib/organizations/schemas";
import { createInvoiceAction, updateInvoiceAction } from "@/lib/invoicing/mutations";
import type { InvoiceWithLines } from "@/lib/invoicing/types";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/shell/icons";
import { formatMoney } from "@/lib/format";

type Option = { id: string; name: string };
type SeriesOption = { id: string; series: string };
type CatalogOption = {
  id: string;
  name: string;
  unit: string;
  price: number;
  vatRate: number;
};

function emptyLine(): InvoiceDraftInput["lines"][number] {
  return {
    productServiceId: "",
    description: "",
    quantity: 1,
    unit: "buc",
    unitPrice: 0,
    vatRate: 0,
    discountPercent: 0,
  };
}

function toDefaults(
  invoice: InvoiceWithLines | undefined,
  seriesId: string,
  currency: string,
): InvoiceDraftInput {
  if (invoice) {
    return {
      clientId: invoice.clientId,
      projectId: invoice.projectId ?? "",
      seriesId: invoice.seriesId,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate ?? "",
      currency: invoice.currency as InvoiceDraftInput["currency"],
      exchangeRate: invoice.exchangeRate ?? undefined,
      paymentTerms: invoice.paymentTerms ?? "",
      notes: invoice.notes ?? "",
      lines: invoice.lines.map((l) => ({
        productServiceId: l.productServiceId ?? "",
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        vatRate: l.vatRate,
        discountPercent: l.discountPercent,
      })),
    };
  }
  return {
    clientId: "",
    projectId: "",
    seriesId,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    currency: currency as InvoiceDraftInput["currency"],
    exchangeRate: undefined,
    paymentTerms: "",
    notes: "",
    lines: [emptyLine()],
  };
}

export function InvoiceForm({
  invoice,
  clients,
  projects,
  series,
  catalog,
  defaultSeriesId,
  defaultCurrency,
}: {
  invoice?: InvoiceWithLines;
  clients: Option[];
  projects: Option[];
  series: SeriesOption[];
  catalog: CatalogOption[];
  defaultSeriesId: string;
  defaultCurrency: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceDraftInput>({
    resolver: zodResolver(invoiceDraftSchema),
    defaultValues: toDefaults(invoice, defaultSeriesId, defaultCurrency),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const watchedLines = watch("lines");
  const currency = watch("currency");

  const totals = useMemo(
    () =>
      computeInvoice(
        (watchedLines ?? []).map((l) => ({
          quantity: Number(l?.quantity) || 0,
          unitPrice: Number(l?.unitPrice) || 0,
          vatRate: Number(l?.vatRate) || 0,
          discountPercent: Number(l?.discountPercent) || 0,
        })),
      ),
    [watchedLines],
  );

  function addFromCatalog(itemId: string) {
    const item = catalog.find((c) => c.id === itemId);
    if (!item) return;
    append({
      productServiceId: item.id,
      description: item.name,
      quantity: 1,
      unit: item.unit,
      unitPrice: item.price,
      vatRate: item.vatRate,
      discountPercent: 0,
    });
  }

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = invoice
        ? await updateInvoiceAction(invoice.id, data)
        : await createInvoiceAction(data);
      if (result?.error) setServerError(result.error);
    });
  });

  const linesError = errors.lines?.message ?? errors.lines?.root?.message;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Client" required error={errors.clientId?.message}>
          <Select {...register("clientId")}>
            <option value="">Alege un client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Proiect" error={errors.projectId?.message}>
          <Select {...register("projectId")}>
            <option value="">Fără proiect</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Serie" required error={errors.seriesId?.message}>
          <Select {...register("seriesId")}>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.series}
              </option>
            ))}
          </Select>
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
        <Field label="Data emiterii" required error={errors.issueDate?.message}>
          <Input type="date" {...register("issueDate")} />
        </Field>
        <Field label="Scadență" error={errors.dueDate?.message}>
          <Input type="date" {...register("dueDate")} />
        </Field>
        {currency !== "RON" && (
          <Field label="Curs de schimb" hint="opțional, față de RON" error={errors.exchangeRate?.message}>
            <Input
              type="number"
              step="0.0001"
              min={0}
              {...register("exchangeRate", {
                setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
              })}
            />
          </Field>
        )}
        <Field label="Termeni de plată" error={errors.paymentTerms?.message}>
          <Input {...register("paymentTerms")} placeholder="ex. 30 de zile" />
        </Field>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Linii factură</h2>
          {catalog.length > 0 && (
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-500"
              value=""
              onChange={(e) => {
                if (e.target.value) addFromCatalog(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">+ Adaugă din catalog</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const line = totals.lines[index];
            const lineErrors = errors.lines?.[index];
            return (
              <div
                key={field.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="grid gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-12">
                    <input
                      {...register(`lines.${index}.description`)}
                      placeholder="Descriere"
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-slate-500"
                    />
                    {lineErrors?.description && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {lineErrors.description.message}
                      </p>
                    )}
                  </div>
                  <LineNumber
                    label="Cantitate"
                    className="sm:col-span-3"
                    step="0.0001"
                    error={lineErrors?.quantity?.message}
                    {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                  />
                  <div className="sm:col-span-2">
                    <label className="text-[0.6875rem] font-medium text-slate-500">Unitate</label>
                    <input
                      {...register(`lines.${index}.unit`)}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                  <LineNumber
                    label="Preț unitar"
                    className="sm:col-span-3"
                    step="0.01"
                    error={lineErrors?.unitPrice?.message}
                    {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })}
                  />
                  <LineNumber
                    label="TVA %"
                    className="sm:col-span-2"
                    step="0.01"
                    error={lineErrors?.vatRate?.message}
                    {...register(`lines.${index}.vatRate`, { valueAsNumber: true })}
                  />
                  <LineNumber
                    label="Discount %"
                    className="sm:col-span-2"
                    step="0.01"
                    error={lineErrors?.discountPercent?.message}
                    {...register(`lines.${index}.discountPercent`, { valueAsNumber: true })}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Net {formatMoney(line?.lineNet ?? 0, currency)} · TVA{" "}
                    {formatMoney(line?.lineVat ?? 0, currency)}
                  </span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600"
                    >
                      <Icon name="close" className="h-3.5 w-3.5" />
                      Șterge linia
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => append(emptyLine())}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Icon name="plus" className="h-4 w-4" />
          Adaugă linie
        </button>
        {linesError && <p className="mt-1 text-xs text-red-600">{linesError}</p>}
      </section>

      <section className="ml-auto w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal</span>
          <span className="tabular-nums">{formatMoney(totals.subtotal, currency)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-slate-500">TVA</span>
          <span className="tabular-nums">{formatMoney(totals.vatTotal, currency)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(totals.total, currency)}</span>
        </div>
      </section>

      <Field label="Note" error={errors.notes?.message}>
        <Textarea {...register("notes")} placeholder="Apar pe factură" />
      </Field>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Se salvează…" : invoice ? "Salvează ciorna" : "Creează ciorna"}
        </Button>
        <ButtonLink href={invoice ? `/invoices/${invoice.id}` : "/invoices"} variant="ghost">
          Anulează
        </ButtonLink>
      </div>
    </form>
  );
}

type LineNumberProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  className?: string;
};

const LineNumber = forwardRef<HTMLInputElement, LineNumberProps>(function LineNumber(
  { label, error, className = "", ...props },
  ref,
) {
  return (
    <div className={className}>
      <label className="text-[0.6875rem] font-medium text-slate-500">{label}</label>
      <input
        ref={ref}
        type="number"
        {...props}
        className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-slate-500"
      />
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  );
});
