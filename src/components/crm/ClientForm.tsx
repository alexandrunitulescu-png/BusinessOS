"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientInput } from "@/lib/crm/schemas";
import { createClientAction, updateClientAction } from "@/lib/crm/mutations";
import type { Client } from "@/lib/crm/types";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";

function toDefaults(client?: Client): ClientInput {
  return {
    type: client?.type ?? "COMPANY",
    companyName: client?.companyName ?? "",
    firstName: client?.firstName ?? "",
    lastName: client?.lastName ?? "",
    cui: client?.cui ?? "",
    registrationNumber: client?.registrationNumber ?? "",
    contactPerson: client?.contactPerson ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    addressLine: client?.addressLine ?? "",
    city: client?.city ?? "",
    county: client?.county ?? "",
    country: client?.country ?? "RO",
    iban: client?.iban ?? "",
    notes: client?.notes ?? "",
    isActive: client?.isActive ?? true,
  };
}

export function ClientForm({
  client,
  readOnly = false,
}: {
  client?: Client;
  readOnly?: boolean;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: toDefaults(client),
  });

  const type = watch("type");

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = client
        ? await updateClientAction(client.id, data)
        : await createClientAction(data);
      if (result?.error) setServerError(result.error);
      // On success the action redirects.
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <fieldset disabled={readOnly} className="flex flex-col gap-5 disabled:opacity-90">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tip" required>
          <Select {...register("type")}>
            <option value="COMPANY">Companie</option>
            <option value="PERSON">Persoană fizică</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select {...register("isActive", { setValueAs: (v) => v === "true" || v === true })}>
            <option value="true">Activ</option>
            <option value="false">Inactiv</option>
          </Select>
        </Field>
      </div>

      {type === "COMPANY" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Denumire companie" required error={errors.companyName?.message}>
            <Input {...register("companyName")} />
          </Field>
          <Field label="Persoană de contact" error={errors.contactPerson?.message}>
            <Input {...register("contactPerson")} />
          </Field>
          <Field label="CUI" error={errors.cui?.message}>
            <Input {...register("cui")} placeholder="RO12345678" />
          </Field>
          <Field label="Nr. înregistrare" error={errors.registrationNumber?.message}>
            <Input {...register("registrationNumber")} placeholder="J40/1234/2020" />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prenume" required error={errors.firstName?.message}>
            <Input {...register("firstName")} />
          </Field>
          <Field label="Nume" required error={errors.lastName?.message}>
            <Input {...register("lastName")} />
          </Field>
          <Field label="CNP / CUI" error={errors.cui?.message}>
            <Input {...register("cui")} />
          </Field>
        </div>
      )}

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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="IBAN" error={errors.iban?.message}>
          <Input {...register("iban")} placeholder="RO49 AAAA 1B31 0075 9384 0000" />
        </Field>
      </div>

      <Field label="Note" error={errors.notes?.message}>
        <Textarea {...register("notes")} />
      </Field>
      </fieldset>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        {!readOnly && (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Se salvează…" : client ? "Salvează" : "Adaugă client"}
          </Button>
        )}
        <ButtonLink href="/clients" variant={readOnly ? "secondary" : "ghost"}>
          {readOnly ? "Înapoi" : "Anulează"}
        </ButtonLink>
      </div>
    </form>
  );
}
