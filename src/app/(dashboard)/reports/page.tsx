import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { getFinancialReport } from "@/lib/reports/queries";
import { getOrganizationBillingInfo } from "@/lib/organizations/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { MonthlyBarChart } from "@/components/reports/MonthlyBarChart";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { formatMoney, formatNumber, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Rapoarte · BusinessOS" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  return { from: `${year}-01-01`, to: now.toISOString().slice(0, 10) };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("money");
  const { from: fromParam, to: toParam } = await searchParams;
  const def = defaultRange();
  const from = fromParam && DATE_RE.test(fromParam) ? fromParam : def.from;
  const to = toParam && DATE_RE.test(toParam) ? toParam : def.to;

  const [report, org] = await Promise.all([
    getFinancialReport(supabase, membership.id, membership.defaultCurrency, from, to),
    getOrganizationBillingInfo(supabase, membership.id),
  ]);
  const cur = report.currency;
  const showVat = org?.vatRegistered ?? false;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <PageHeader
        title="Rapoarte"
        description="Sinteza financiară pe o perioadă aleasă."
      />

      <form className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">De la</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Până la</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Aplică
        </button>
      </form>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Facturat" value={formatMoney(report.invoiced, cur)} icon="file-text" />
        <KpiCard label="Încasat" value={formatMoney(report.collected, cur)} icon="wallet" tone="positive" />
        <KpiCard label="Cheltuieli" value={formatMoney(report.expenses, cur)} icon="receipt" />
        <KpiCard
          label="Profit (facturat − cheltuieli)"
          value={formatMoney(report.profit, cur)}
          icon="bar-chart"
          tone={report.profit >= 0 ? "positive" : "warning"}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Plătit către furnizori" value={formatMoney(report.paidOut, cur)} icon="truck" />
        <KpiCard
          label="De încasat (sold total)"
          value={formatMoney(report.outstanding, cur)}
          icon="receipt"
          tone={report.outstanding > 0 ? "warning" : "default"}
        />
        {showVat && (
          <>
            <KpiCard label="TVA colectat" value={formatMoney(report.vatCollected, cur)} icon="file-text" />
            <KpiCard label="TVA deductibil" value={formatMoney(report.vatDeductible, cur)} icon="receipt" />
          </>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Facturat vs cheltuieli, pe lună</h2>
        <div className="mt-3">
          <MonthlyBarChart data={report.monthly} currency={cur} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Sold clienți pe vechime</h2>
          <Table>
            <THead>
              <tr>
                <TH>Interval</TH>
                <TH className="text-right">Facturi</TH>
                <TH className="text-right">Sumă</TH>
              </tr>
            </THead>
            <TBody>
              {report.aging.map((b) => (
                <TR key={b.label}>
                  <TD>{b.label}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(b.count)}</TD>
                  <TD className="text-right tabular-nums">{formatMoney(b.amount, cur)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Top clienți (facturat în perioadă)</h2>
          {report.topClients.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Nicio factură în perioadă.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {report.topClients.map((c) => (
                <li key={c.name} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">{c.name}</span>
                  <span className="font-medium tabular-nums text-slate-900">
                    {formatMoney(c.amount, cur)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Perioadă: {formatDate(report.from)} – {formatDate(report.to)} · {report.invoiceCount} facturi
      </p>
    </div>
  );
}
