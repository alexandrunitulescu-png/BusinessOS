import type { Metadata } from "next";
import Link from "next/link";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { listEmployees, PAGE_SIZE } from "@/lib/employees/queries";
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  type EmployeeStatus,
} from "@/lib/employees/schemas";
import { employeeFullName } from "@/lib/employees/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Angajați · BusinessPuls" };

function isStatus(v: string | undefined): v is EmployeeStatus {
  return !!v && (EMPLOYEE_STATUSES as readonly string[]).includes(v);
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("employees", "read", "EMPLOYEES");
  const { q, page: pageParam, status: statusParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = q?.trim() || undefined;
  const status = isStatus(statusParam) ? statusParam : undefined;
  const canWrite = hasPermission(membership.role, "employees", "write");

  const { employees, total } = await listEmployees(supabase, membership.id, { search, page, status });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Angajați"
        description="Evidența personalului — contract, funcție și date de contact. Fără salarizare."
        action={
          canWrite ? (
            <ButtonLink href="/employees/new" size="sm">
              Adaugă angajat
            </ButtonLink>
          ) : undefined
        }
      />

      <form className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Caută după nume, funcție sau departament"
          aria-label="Caută angajați"
          className="w-full max-w-xs rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text outline-none focus:border-brand"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text outline-none focus:border-brand"
        >
          <option value="">Toate statusurile</option>
          {EMPLOYEE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {EMPLOYEE_STATUS_LABELS[s]}
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

      {employees.length === 0 ? (
        <EmptyState
          icon="id-card"
          title={search || status ? "Niciun angajat găsit" : "Niciun angajat încă"}
          description={
            search || status
              ? "Încearcă alt filtru sau termen de căutare."
              : "Adaugă primul angajat pentru a ține evidența personalului."
          }
          action={
            canWrite && !search && !status ? (
              <ButtonLink href="/employees/new" size="sm">
                Adaugă angajat
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
                <TH>Funcție</TH>
                <TH>Departament</TH>
                <TH>Contract</TH>
                <TH>Angajat din</TH>
                <TH className="text-right">Status</TH>
              </tr>
            </THead>
            <TBody>
              {employees.map((e) => (
                <TR key={e.id}>
                  <TD className="font-medium text-text">
                    <Link href={`/employees/${e.id}`} className="hover:underline">
                      {employeeFullName(e)}
                    </Link>
                  </TD>
                  <TD>{e.jobTitle ?? "—"}</TD>
                  <TD>{e.department ?? "—"}</TD>
                  <TD>{e.contractType ? CONTRACT_TYPE_LABELS[e.contractType] : "—"}</TD>
                  <TD>{e.hireDate ? formatDate(e.hireDate) : "—"}</TD>
                  <TD className="text-right">
                    <Badge tone={e.status === "ACTIVE" ? "green" : "neutral"}>
                      {EMPLOYEE_STATUS_LABELS[e.status]}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath="/employees"
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
