"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  employeeSchema,
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABELS,
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  type EmployeeInput,
} from "@/lib/employees/schemas";
import { CURRENCIES } from "@/lib/organizations/schemas";
import { createEmployeeAction, updateEmployeeAction } from "@/lib/employees/mutations";
import type { Employee } from "@/lib/employees/types";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";

function toDefaults(e: Employee | undefined, fallbackCurrency: string): EmployeeInput {
  return {
    firstName: e?.firstName ?? "",
    lastName: e?.lastName ?? "",
    email: e?.email ?? "",
    phone: e?.phone ?? "",
    jobTitle: e?.jobTitle ?? "",
    department: e?.department ?? "",
    status: e?.status ?? "ACTIVE",
    hireDate: e?.hireDate ?? "",
    cnp: e?.cnp ?? "",
    contractType: e?.contractType ?? "",
    contractStartDate: e?.contractStartDate ?? "",
    contractEndDate: e?.contractEndDate ?? "",
    baseSalary: e?.baseSalary ?? undefined,
    salaryCurrency:
      (e?.salaryCurrency as EmployeeInput["salaryCurrency"]) ??
      (fallbackCurrency as EmployeeInput["salaryCurrency"]),
    iban: e?.iban ?? "",
    notes: e?.notes ?? "",
  };
}

export function EmployeeForm({
  employee,
  defaultCurrency,
  readOnly = false,
}: {
  employee?: Employee;
  defaultCurrency: string;
  readOnly?: boolean;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: toDefaults(employee, defaultCurrency),
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = employee
        ? await updateEmployeeAction(employee.id, data)
        : await createEmployeeAction(data);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <fieldset disabled={readOnly} className="flex flex-col gap-6 disabled:opacity-90">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nume" required error={errors.lastName?.message}>
              <Input {...register("lastName")} />
            </Field>
            <Field label="Prenume" required error={errors.firstName?.message}>
              <Input {...register("firstName")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Funcție" error={errors.jobTitle?.message}>
              <Input {...register("jobTitle")} />
            </Field>
            <Field label="Departament" error={errors.department?.message}>
              <Input {...register("department")} />
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" required error={errors.status?.message}>
              <Select {...register("status")}>
                {EMPLOYEE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {EMPLOYEE_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data angajării" error={errors.hireDate?.message}>
              <Input type="date" {...register("hireDate")} />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-5">
          <p className="text-sm font-semibold text-text">Contract</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CNP" hint="opțional — se validează cifra de control" error={errors.cnp?.message}>
              <Input inputMode="numeric" maxLength={13} {...register("cnp")} />
            </Field>
            <Field label="Tip contract" error={errors.contractType?.message}>
              <Select {...register("contractType")}>
                <option value="">—</option>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CONTRACT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Început contract" error={errors.contractStartDate?.message}>
              <Input type="date" {...register("contractStartDate")} />
            </Field>
            <Field label="Sfârșit contract" hint="pentru perioadă determinată" error={errors.contractEndDate?.message}>
              <Input type="date" {...register("contractEndDate")} />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-5">
          <p className="text-sm font-semibold text-text">Salariu</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Salariu de bază" hint="brut, opțional" error={errors.baseSalary?.message}>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register("baseSalary", {
                  setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                })}
              />
            </Field>
            <Field label="Monedă" error={errors.salaryCurrency?.message}>
              <Select {...register("salaryCurrency")}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="IBAN" hint="pentru plata salariului" error={errors.iban?.message}>
              <Input {...register("iban")} />
            </Field>
          </div>
        </div>

        <Field label="Note" error={errors.notes?.message}>
          <Textarea {...register("notes")} />
        </Field>
      </fieldset>

      {serverError && <p className="text-sm text-critical">{serverError}</p>}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        {!readOnly && (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Se salvează…" : employee ? "Salvează" : "Adaugă angajat"}
          </Button>
        )}
        <ButtonLink href="/employees" variant={readOnly ? "secondary" : "ghost"}>
          {readOnly ? "Înapoi" : "Anulează"}
        </ButtonLink>
      </div>
    </form>
  );
}
