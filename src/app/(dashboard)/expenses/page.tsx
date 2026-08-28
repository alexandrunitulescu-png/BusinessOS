import type { Metadata } from "next";
import Link from "next/link";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { listExpenses, PAGE_SIZE } from "@/lib/expenses/queries";
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  type PaymentStatus,
} from "@/lib/expenses/schemas";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { formatMoney, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Cheltuieli · BusinessPuls" };

const STATUS_TONE: Record<PaymentStatus, "neutral" | "amber" | "green"> = {
  UNPAID: "neutral",
  PARTIALLY_PAID: "amber",
  PAID: "green",
};

function isStatus(v: string | undefined): v is PaymentStatus {
  return !!v && (PAYMENT_STATUSES as readonly string[]).includes(v);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("money", "read", "EXPENSES");
  const { q, page: pageParam, status: statusParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = q?.trim() || undefined;
  const status = isStatus(statusParam) ? statusParam : undefined;
  const canWrite = hasPermission(membership.role, "money", "write");

  const { expenses, total } = await listExpenses(supabase, membership.id, {
    search,
    page,
    status,
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Cheltuieli"
        description="Înregistrează cheltuielile și urmărește ce ai plătit."
        action={
          canWrite ? (
            <ButtonLink href="/expenses/new" size="sm">
              Adaugă cheltuială
            </ButtonLink>
          ) : undefined
        }
      />

      <form className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Caută după descriere sau categorie"
          aria-label="Caută cheltuieli"
          className="w-full max-w-xs rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text outline-none focus:border-brand"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text outline-none focus:border-brand"
        >
          <option value="">Toate</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_LABELS[s]}
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

      {expenses.length === 0 ? (
        <EmptyState
          icon="receipt"
          title={search || status ? "Nicio cheltuială găsită" : "Nicio cheltuială încă"}
          description={
            search || status
              ? "Încearcă alt filtru."
              : "Adaugă prima cheltuială pentru a urmări banii care ies."
          }
          action={
            canWrite && !search && !status ? (
              <ButtonLink href="/expenses/new" size="sm">
                Adaugă cheltuială
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Descriere</TH>
                <TH>Furnizor</TH>
                <TH>Data</TH>
                <TH className="text-right">Sumă</TH>
                <TH className="text-right">Status</TH>
              </tr>
            </THead>
            <TBody>
              {expenses.map((exp) => (
                <TR key={exp.id}>
                  <TD className="font-medium text-text">
                    <Link href={`/expenses/${exp.id}`} className="hover:underline">
                      {exp.description || exp.category || "Cheltuială"}
                    </Link>
                  </TD>
                  <TD>{exp.supplierName ?? "—"}</TD>
                  <TD>{formatDate(exp.expenseDate)}</TD>
                  <TD className="text-right tabular-nums">
                    {formatMoney(exp.amount, exp.currency)}
                  </TD>
                  <TD className="text-right">
                    <Badge tone={STATUS_TONE[exp.paymentStatus]}>
                      {PAYMENT_STATUS_LABELS[exp.paymentStatus]}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath="/expenses"
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
