import type { Metadata } from "next";
import Link from "next/link";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { listInvoices, PAGE_SIZE } from "@/lib/invoicing/queries";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
} from "@/lib/invoicing/schemas";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { formatMoney, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Facturi · BusinessPuls" };

const STATUS_TONE: Record<InvoiceStatus, "neutral" | "green" | "amber" | "blue" | "red"> = {
  DRAFT: "neutral",
  ISSUED: "blue",
  SENT: "blue",
  PARTIALLY_PAID: "amber",
  PAID: "green",
  OVERDUE: "red",
  CANCELLED: "red",
};

function isStatus(v: string | undefined): v is InvoiceStatus {
  return !!v && (INVOICE_STATUSES as readonly string[]).includes(v);
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("money");
  const { q, page: pageParam, status: statusParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = q?.trim() || undefined;
  const status = isStatus(statusParam) ? statusParam : undefined;
  const canWrite = hasPermission(membership.role, "money", "write");

  const { invoices, total } = await listInvoices(supabase, membership.id, {
    search,
    page,
    status,
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Facturi"
        description="Emite facturi și urmărește statusul lor comercial."
        action={
          canWrite ? (
            <ButtonLink href="/invoices/new" size="sm">
              Factură nouă
            </ButtonLink>
          ) : undefined
        }
      />

      <form className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Caută după serie sau număr"
          aria-label="Caută facturi"
          className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        >
          <option value="">Toate statusurile</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {INVOICE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Filtrează
        </button>
      </form>

      {invoices.length === 0 ? (
        <EmptyState
          icon="file-text"
          title={search || status ? "Nicio factură găsită" : "Nicio factură încă"}
          description={
            search || status
              ? "Încearcă alt filtru."
              : "Creează prima factură — pornește ca ciornă, apoi o emiți."
          }
          action={
            canWrite && !search && !status ? (
              <ButtonLink href="/invoices/new" size="sm">
                Factură nouă
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Număr</TH>
                <TH>Client</TH>
                <TH>Emisă</TH>
                <TH>Scadență</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Status</TH>
              </tr>
            </THead>
            <TBody>
              {invoices.map((inv) => {
                const overdue =
                  inv.dueDate != null &&
                  inv.dueDate < today &&
                  (inv.status === "ISSUED" || inv.status === "SENT" || inv.status === "PARTIALLY_PAID");
                return (
                  <TR key={inv.id}>
                    <TD className="font-medium text-slate-900">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.number}
                      </Link>
                    </TD>
                    <TD>{inv.clientName ?? "—"}</TD>
                    <TD>{formatDate(inv.issueDate)}</TD>
                    <TD className={overdue ? "text-red-600" : undefined}>
                      {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {formatMoney(inv.total, inv.currency)}
                    </TD>
                    <TD className="text-right">
                      <Badge tone={overdue ? "red" : STATUS_TONE[inv.status]}>
                        {overdue ? "Scadentă" : INVOICE_STATUS_LABELS[inv.status]}
                      </Badge>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination
            basePath="/invoices"
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
