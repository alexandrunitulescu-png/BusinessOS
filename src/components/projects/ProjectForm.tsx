"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  projectSchema,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectInput,
} from "@/lib/projects/schemas";
import { CURRENCIES } from "@/lib/organizations/schemas";
import { createProjectAction, updateProjectAction } from "@/lib/projects/mutations";
import type { Project } from "@/lib/projects/types";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";

type ClientOption = { id: string; name: string };

function toDefaults(project: Project | undefined, fallbackCurrency: string): ProjectInput {
  return {
    name: project?.name ?? "",
    clientId: project?.clientId ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "PLANNED",
    startDate: project?.startDate ?? "",
    deadline: project?.deadline ?? "",
    budget: project?.budget ?? undefined,
    currency: (project?.currency as ProjectInput["currency"]) ??
      (fallbackCurrency as ProjectInput["currency"]),
  };
}

export function ProjectForm({
  project,
  clients,
  defaultCurrency,
  readOnly = false,
}: {
  project?: Project;
  clients: ClientOption[];
  defaultCurrency: string;
  readOnly?: boolean;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: toDefaults(project, defaultCurrency),
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = project
        ? await updateProjectAction(project.id, data)
        : await createProjectAction(data);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <fieldset disabled={readOnly} className="flex flex-col gap-5 disabled:opacity-90">
        <Field label="Nume proiect" required error={errors.name?.message}>
          <Input {...register("name")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" error={errors.clientId?.message}>
            <Select {...register("clientId")}>
              <option value="">Fără client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" required error={errors.status?.message}>
            <Select {...register("status")}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Descriere" error={errors.description?.message}>
          <Textarea {...register("description")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data de început" error={errors.startDate?.message}>
            <Input type="date" {...register("startDate")} />
          </Field>
          <Field label="Termen limită" error={errors.deadline?.message}>
            <Input type="date" {...register("deadline")} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Buget" hint="opțional" error={errors.budget?.message}>
            <Input
              type="number"
              step="0.01"
              min={0}
              {...register("budget", {
                setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
              })}
            />
          </Field>
          <Field label="Monedă" error={errors.currency?.message}>
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

      {serverError && <p className="text-sm text-critical">{serverError}</p>}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        {!readOnly && (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Se salvează…" : project ? "Salvează" : "Adaugă proiect"}
          </Button>
        )}
        <ButtonLink href="/projects" variant={readOnly ? "secondary" : "ghost"}>
          {readOnly ? "Înapoi" : "Anulează"}
        </ButtonLink>
      </div>
    </form>
  );
}
