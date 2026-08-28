import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveMembership } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getDashboardMetrics } from "@/lib/dashboard/queries";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Icon } from "@/components/shell/icons";
import { formatMoney, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Panou principal · BusinessPuls" };

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Proprietar",
  ADMIN: "Administrator",
  ACCOUNTANT: "Contabil",
  EMPLOYEE: "Angajat",
  READ_ONLY: "Vizualizare",
};

export default async function DashboardPage() {
  const { supabase, membership } = await requireActiveMembership();
  const orgName = membership.tradeName || membership.legalName;

  const canSeeMoney = hasPermission(membership.role, "money", "read");
  const canSeeBusiness = hasPermission(membership.role, "business", "read");

  const metrics = await getDashboardMetrics(
    supabase,
    membership.id,
    membership.defaultCurrency,
  );

  const monthLabel = new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text">{orgName}</h1>
          <p className="mt-0.5 text-sm text-text-muted first-letter:uppercase">{monthLabel}</p>
        </div>
        <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-text-muted">
          {ROLE_LABELS[membership.role] ?? membership.role}
        </span>
      </header>

      {canSeeMoney && (
        <section className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Încasări luna aceasta"
              value={formatMoney(metrics.incomeThisMonth, metrics.currency)}
              icon="wallet"
              tone="positive"
            />
            <KpiCard
              label="Facturat luna aceasta"
              value={formatMoney(metrics.billedThisMonth, metrics.currency)}
              icon="file-text"
            />
            <KpiCard
              label="De încasat"
              value={formatMoney(metrics.outstanding, metrics.currency)}
              hint={
                metrics.overdueCount > 0
                  ? `${formatNumber(metrics.overdueCount)} facturi scadente`
                  : "nicio factură scadentă"
              }
              icon="receipt"
              tone={metrics.overdueCount > 0 ? "warning" : "default"}
            />
            <KpiCard
              label="Cheltuieli luna aceasta"
              value={formatMoney(metrics.expensesThisMonth, metrics.currency)}
              icon="bar-chart"
            />
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-raised p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-text">Activitate recentă</h2>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-sunken text-text-subtle">
              <Icon name="bar-chart" className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm text-text-muted">
              Nu există încă activitate. Facturile, plățile și cheltuielile vor apărea aici pe
              măsură ce le înregistrezi.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h2 className="text-sm font-semibold text-text">Sumar</h2>
          <dl className="mt-3 flex flex-col gap-2.5 text-sm">
            {canSeeBusiness && (
              <>
                <div className="flex items-center justify-between">
                  <dt className="text-text-muted">Clienți activi</dt>
                  <dd className="font-medium text-text">
                    {formatNumber(metrics.clientsCount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-text-muted">Proiecte active</dt>
                  <dd className="font-medium text-text">
                    {formatNumber(metrics.activeProjectsCount)}
                  </dd>
                </div>
              </>
            )}
            {canSeeMoney && (
              <>
                <div className="flex items-center justify-between">
                  <dt className="text-text-muted">Facturi în ciornă</dt>
                  <dd className="font-medium text-text">
                    {formatNumber(metrics.draftCount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-text-muted">Facturi scadente</dt>
                  <dd
                    className={`font-medium ${
                      metrics.overdueCount > 0 ? "text-warning" : "text-text"
                    }`}
                  >
                    {formatNumber(metrics.overdueCount)}
                  </dd>
                </div>
              </>
            )}
          </dl>

          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-text hover:underline"
          >
            <Icon name="settings" className="h-4 w-4" />
            Setările organizației
          </Link>
        </div>
      </section>
    </div>
  );
}
