import type { Metadata } from "next";
import Link from "next/link";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { listProjects, PAGE_SIZE } from "@/lib/projects/queries";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/projects/schemas";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { formatMoney, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Proiecte · BusinessPuls" };

const STATUS_TONE: Record<ProjectStatus, "neutral" | "green" | "amber" | "blue" | "red"> = {
  PLANNED: "neutral",
  ACTIVE: "green",
  ON_HOLD: "amber",
  COMPLETED: "blue",
  CANCELLED: "red",
};

function isStatus(v: string | undefined): v is ProjectStatus {
  return !!v && (PROJECT_STATUSES as readonly string[]).includes(v);
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("business", "read", "PROJECTS");
  const { q, page: pageParam, status: statusParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = q?.trim() || undefined;
  const status = isStatus(statusParam) ? statusParam : undefined;
  const canWrite = hasPermission(membership.role, "business", "write");

  const { projects, total } = await listProjects(supabase, membership.id, {
    search,
    page,
    status,
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Proiecte"
        description="Organizează munca pe proiecte și leagă-le de clienți."
        action={
          canWrite ? (
            <ButtonLink href="/projects/new" size="sm">
              Adaugă proiect
            </ButtonLink>
          ) : undefined
        }
      />

      <form className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Caută după nume sau descriere"
          aria-label="Caută proiecte"
          className="w-full max-w-xs rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text outline-none focus:border-brand"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text outline-none focus:border-brand"
        >
          <option value="">Toate statusurile</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm font-medium text-text hover:bg-surface-sunken"
        >
          Filtrează
        </button>
      </form>

      {projects.length === 0 ? (
        <EmptyState
          icon="folder"
          title={search || status ? "Niciun proiect găsit" : "Niciun proiect încă"}
          description={
            search || status
              ? "Încearcă alt filtru sau termen de căutare."
              : "Adaugă primul proiect pentru a organiza munca pe clienți."
          }
          action={
            canWrite && !search && !status ? (
              <ButtonLink href="/projects/new" size="sm">
                Adaugă proiect
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Nume</TH>
                <TH>Client</TH>
                <TH>Status</TH>
                <TH>Termen</TH>
                <TH className="text-right">Buget</TH>
              </tr>
            </THead>
            <TBody>
              {projects.map((project) => (
                <TR key={project.id}>
                  <TD className="font-medium text-text">
                    <Link href={`/projects/${project.id}`} className="hover:underline">
                      {project.name}
                    </Link>
                  </TD>
                  <TD>{project.clientName ?? "—"}</TD>
                  <TD>
                    <Badge tone={STATUS_TONE[project.status]}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  </TD>
                  <TD>{project.deadline ? formatDate(project.deadline) : "—"}</TD>
                  <TD className="text-right tabular-nums">
                    {project.budget != null
                      ? formatMoney(project.budget, project.currency ?? membership.defaultCurrency)
                      : "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath="/projects"
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            params={{ q: search, status }}
          />
        </>
      )}
    </div>
  );
}
