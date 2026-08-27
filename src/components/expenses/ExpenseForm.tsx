"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, EXPENSE_CATEGORIES, type ExpenseInput } from "@/lib/expenses/schemas";
import { CURRENCIES } from "@/lib/organizations/schemas";
import { createExpenseAction, updateExpenseAction } from "@/lib/expenses/mutations";
import type { Expense } from "@/lib/expenses/types";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";

type Option = { id: string; name: string };

function toDefaults(expense: Expense | undefined, currency: string): ExpenseInput {
  return {
    supplierId: expense?.supplierId ?? "",
    projectId: expense?.projectId ?? "",
    expenseDate: expense?.expenseDate ?? new Date().toISOString().slice(0, 10),
    category: expense?.category ?? "",
    description: expense?.description ?? "",
    amount: expense?.amount ?? 0,
    vatAmount: expense?.vatAmount ?? 0,
    currency: (expense?.currency as ExpenseInput["currency"]) ??
      (currency as ExpenseInput["currency"]),
  };
}

export function ExpenseForm({
  expense,
  suppliers,
  projects,
  defaultCurrency,
  readOnly = false,
}: {
  expense?: Expense;
  suppliers: Option[];
  projects: Option[];
  defaultCurrency: string;
  readOnly?: boolean;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: toDefaults(expense, defaultCurrency),
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = expense
        ? await updateExpenseAction(expense.id, data)
        : await createExpenseAction(data);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <fieldset disabled={readOnly} className="flex flex-col gap-5 disabled:opacity-90">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Furnizor" error={errors.supplierId?.message}>
            <Select {...register("supplierId")}>
              <option value="">Fără furnizor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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
          <Field label="Data cheltuielii" required error={errors.expenseDate?.message}>
            <Input type="date" {...register("expenseDate")} />
          </Field>
          <Field label="Categorie" error={errors.category?.message}>
            <Input list="expense-categories" {...register("category")} />
            <datalist id="expense-categories">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field label="Descriere" error={errors.description?.message}>
          <Textarea {...register("description")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Sumă (cu TVA)" required error={errors.amount?.message}>
            <Input
              type="number"
              step="0.01"
              min={0}
              {...register("amount", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Din care TVA" required error={errors.vatAmount?.message}>
            <Input
              type="number"
              step="0.01"
              min={0}
              {...register("vatAmount", { valueAsNumber: true })}
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
        </div>
      </fieldset>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        {!readOnly && (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Se salvează…" : expense ? "Salvează" : "Adaugă cheltuiala"}
          </Button>
        )}
        <ButtonLink href="/expenses" variant={readOnly ? "secondary" : "ghost"}>
          {readOnly ? "Înapoi" : "Anulează"}
        </ButtonLink>
      </div>
    </form>
  );
}
