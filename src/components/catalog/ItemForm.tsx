"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema, UNITS, type ItemInput } from "@/lib/catalog/schemas";
import { CURRENCIES } from "@/lib/organizations/schemas";
import { createItemAction, updateItemAction } from "@/lib/catalog/mutations";
import type { Item } from "@/lib/catalog/types";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";

function toDefaults(item: Item | undefined, fallbackCurrency: string): ItemInput {
  return {
    type: item?.type ?? "SERVICE",
    name: item?.name ?? "",
    description: item?.description ?? "",
    sku: item?.sku ?? "",
    unit: item?.unit ?? "buc",
    price: item?.price ?? 0,
    currency: (item?.currency as ItemInput["currency"]) ?? (fallbackCurrency as ItemInput["currency"]),
    vatRate: item?.vatRate ?? 0,
    isActive: item?.isActive ?? true,
  };
}

export function ItemForm({
  item,
  defaultCurrency,
  readOnly = false,
}: {
  item?: Item;
  defaultCurrency: string;
  readOnly?: boolean;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: toDefaults(item, defaultCurrency),
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = item
        ? await updateItemAction(item.id, data)
        : await createItemAction(data);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <fieldset disabled={readOnly} className="flex flex-col gap-5 disabled:opacity-90">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nume" required error={errors.name?.message}>
          <Input {...register("name")} />
        </Field>
        <Field label="Tip" required>
          <Select {...register("type")}>
            <option value="SERVICE">Serviciu</option>
            <option value="PRODUCT">Produs</option>
          </Select>
        </Field>
      </div>

      <Field label="Descriere" error={errors.description?.message}>
        <Textarea {...register("description")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Preț" required error={errors.price?.message}>
          <Input
            type="number"
            step="0.01"
            min={0}
            {...register("price", { valueAsNumber: true })}
          />
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
        <Field label="Cotă TVA (%)" required error={errors.vatRate?.message}>
          <Input
            type="number"
            step="0.01"
            min={0}
            max={100}
            {...register("vatRate", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Unitate" required error={errors.unit?.message}>
          <Input list="units" {...register("unit")} />
          <datalist id="units">
            {UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Field>
        <Field label="Cod / SKU" error={errors.sku?.message}>
          <Input {...register("sku")} />
        </Field>
        <Field label="Status">
          <Select {...register("isActive", { setValueAs: (v) => v === "true" || v === true })}>
            <option value="true">Activ</option>
            <option value="false">Inactiv</option>
          </Select>
        </Field>
      </div>
      </fieldset>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        {!readOnly && (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Se salvează…" : item ? "Salvează" : "Adaugă în catalog"}
          </Button>
        )}
        <ButtonLink href="/catalog" variant={readOnly ? "secondary" : "ghost"}>
          {readOnly ? "Înapoi" : "Anulează"}
        </ButtonLink>
      </div>
    </form>
  );
}
