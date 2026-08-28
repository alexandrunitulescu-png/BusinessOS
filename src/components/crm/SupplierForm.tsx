"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema, type SupplierInput } from "@/lib/crm/schemas";
import { createSupplierAction, updateSupplierAction } from "@/lib/crm/mutations";
import type { Supplier } from "@/lib/crm/types";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";

function toDefaults(supplier?: Supplier): SupplierInput {
  return {
    type: supplier?.type ?? "COMPANY",
    companyName: supplier?.companyName ?? "",
    cui: supplier?.cui ?? "",
    registrationNumber: supplier?.registrationNumber ?? "",
    contactPerson: supplier?.contactPerson ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    addressLine: supplier?.addressLine ?? "",
    city: supplier?.city ?? "",
    county: supplier?.county ?? "",
    country: supplier?.country ?? "RO",
    iban: supplier?.iban ?? "",
    notes: supplier?.notes ?? "",
    isActive: supplier?.isActive ?? true,
  };
}

export function SupplierForm({
  supplier,
  readOnly = false,
}: {
  supplier?: Supplier;
  readOnly?: boolean;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: toDefaults(supplier),
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = supplier
        ? await updateSupplierAction(supplier.id, data)
        : await createSupplierAction(data);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <fieldset disabled={readOnly} className="flex flex-col gap-5 disabled:opacity-90">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Denumire furnizor" required error={errors.companyName?.message}>
          <Input {...register("companyName")} />
        </Field>
        <Field label="Tip" required>
          <Select {...register("type")}>
            <option value="COMPANY">Companie</option>
            <option value="PERSON">Persoană fizică</option>
          </Select>
        </Field>
        <Field label="CUI" error={errors.cui?.message}>
          <Input {...register("cui")} placeholder="RO12345678" />
        </Field>
        <Field label="Nr. înregistrare" error={errors.registrationNumber?.message}>
          <Input {...register("registrationNumber")} />
        </Field>
        <Field label="Persoană de contact" error={errors.contactPerson?.message}>
          <Input {...register("contactPerson")} />
        </Field>
        <Field label="Status">
          <Select {...register("isActive", { setValueAs: (v) => v === "true" || v === true })}>
            <option value="true">Activ</option>
            <option value="false">Inactiv</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} />
        </Field>
        <Field label="Telefon" error={errors.phone?.message}>
          <Input {...register("phone")} />
        </Field>
      </div>

      <Field label="Adresă" error={errors.addressLine?.message}>
        <Input {...register("addressLine")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Oraș" error={errors.city?.message}>
          <Input {...register("city")} />
        </Field>
        <Field label="Județ" error={errors.county?.message}>
          <Input {...register("county")} />
        </Field>
        <Field label="Țară" error={errors.country?.message}>
          <Input {...register("country")} />
        </Field>
      </div>

      <Field label="IBAN" error={errors.iban?.message}>
        <Input {...register("iban")} />
      </Field>

      <Field label="Note" error={errors.notes?.message}>
        <Textarea {...register("notes")} />
      </Field>
      </fieldset>

      {serverError && <p className="text-sm text-critical">{serverError}</p>}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        {!readOnly && (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Se salvează…" : supplier ? "Salvează" : "Adaugă furnizor"}
          </Button>
        )}
        <ButtonLink href="/suppliers" variant={readOnly ? "secondary" : "ghost"}>
          {readOnly ? "Înapoi" : "Anulează"}
        </ButtonLink>
      </div>
    </form>
  );
}
