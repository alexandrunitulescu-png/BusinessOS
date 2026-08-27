import type { Metadata } from "next";
import Link from "next/link";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { listPayments, PAGE_SIZE } from "@/lib/payments/queries";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments/schemas";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { formatMoney, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Încasări & plăți · BusinessOS" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("money");
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const canWrite = hasPermission(membership.role, "money", "write");

  const { payments, total } = await listPayments(supabase, membership.id, { page });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Încasări & plăți"
        description="Toate mișcările de bani, legate de facturi și cheltuieli."
        action={
          canWrite ? (
            <ButtonLink href="/payments/new" size="sm">
              Înregistrează plată
            </ButtonLink>
          ) : undefined
        }
      />

      {payments.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Nicio plată încă"
          description="Înregistrează încasările pentru facturi și plățile pentru cheltuieli."
          action={
            canWrite ? (
              <ButtonLink href="/payments/new" size="sm">
                Înregistrează plată
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Data</TH>
                <TH>Tip</TH>
                <TH>Referință</TH>
                <TH>Metodă</TH>
                <TH className="text-right">Sumă</TH>
              </tr>
            </THead>
            <TBody>
              {payments.map((p) => (
                <TR key={p.id}>
                  <TD>{formatDate(p.paymentDate)}</TD>
                  <TD>
                    <Badge tone={p.direction === "IN" ? "green" : "amber"}>
                      {p.direction === "IN" ? "Încasare" : "Plată"}
                    </Badge>
                  </TD>
                  <TD>
                    <Link href={p.targetHref} className="text-slate-700 hover:underline">
                      {p.targetLabel}
                    </Link>
                    {p.reference ? <span className="text-slate-400"> · {p.reference}</span> : null}
                  </TD>
                  <TD>{PAYMENT_METHOD_LABELS[p.paymentMethod]}</TD>
                  <TD
                    className={`text-right tabular-nums ${
                      p.direction === "IN" ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {p.direction === "IN" ? "+" : "−"}
                    {formatMoney(p.amount, p.currency)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination basePath="/payments" page={page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </div>
  );
}
