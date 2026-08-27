import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import {
  getEntitlements,
  getMonthlyUsage,
  getActiveUserCount,
  getStorageBytes,
} from "@/lib/billing/entitlements";
import { listPlans } from "@/lib/billing/queries";
import { getOrganizationBillingInfo } from "@/lib/organizations/queries";
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  type FeatureKey,
} from "@/lib/billing/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { PlanSwitcher } from "@/components/billing/PlanSwitcher";
import { Icon } from "@/components/shell/icons";
import { formatNumber, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Setări · BusinessPuls" };

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000);
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const over = limit !== null && used >= limit;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">{label}</span>
        <span className={`font-medium ${over ? "text-red-600" : "text-slate-900"}`}>
          {formatNumber(used)} / {limit === null ? "∞" : formatNumber(limit)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${over ? "bg-red-500" : "bg-slate-800"}`}
          style={{ width: `${limit === null ? 4 : pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("settings");
  const { feature: requestedFeature } = await searchParams;
  const canManage = hasPermission(membership.role, "settings", "write");

  const [entitlements, plans, org, invoiceUsage, userCount, storageBytes] = await Promise.all([
    getEntitlements(supabase, membership.id),
    listPlans(supabase),
    getOrganizationBillingInfo(supabase, membership.id),
    getMonthlyUsage(supabase, membership.id, "invoices_created"),
    getActiveUserCount(supabase, membership.id),
    getStorageBytes(supabase, membership.id),
  ]);

  if (!entitlements) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Setări" />
        <p className="mt-4 text-sm text-slate-500">Nu am putut încărca abonamentul.</p>
      </div>
    );
  }

  const { plan, subscription, features } = entitlements;
  const trialDays = subscription.status === "TRIAL" ? daysUntil(subscription.trialEndsAt) : null;
  const storageMb = Math.round((storageBytes / (1024 * 1024)) * 10) / 10;
  const gatedFeature =
    requestedFeature && (FEATURE_KEYS as readonly string[]).includes(requestedFeature)
      ? (requestedFeature as FeatureKey)
      : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <PageHeader
        title="Setări"
        description={`${org?.legalName ?? membership.legalName} · CUI ${org?.cui ?? "—"}`}
      />

      {gatedFeature && !features[gatedFeature] && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Funcționalitatea <strong>{FEATURE_LABELS[gatedFeature]}</strong> nu este inclusă în planul{" "}
          {plan.name}. Alege un plan care o include mai jos.
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Plan curent</h2>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">
              {plan.name}
              <span className="ml-2 text-sm font-normal text-slate-500">
                {plan.price ? `${formatMoney(plan.price, plan.currency)}/lună` : "gratuit"}
              </span>
            </p>
          </div>
          <div className="text-right">
            <Badge tone={subscription.status === "ACTIVE" ? "green" : "amber"}>
              {SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? subscription.status}
            </Badge>
            {trialDays !== null && (
              <p className="mt-1 text-xs text-slate-500">
                {trialDays > 0 ? `${trialDays} zile rămase` : "probă expirată"}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Meter label="Facturi luna aceasta" used={invoiceUsage} limit={plan.limits.invoices_per_month} />
          <Meter label="Utilizatori" used={userCount} limit={plan.limits.users} />
          <Meter label="Stocare (MB)" used={storageMb} limit={plan.limits.storage_mb} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Funcționalități</h2>
        <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {FEATURE_KEYS.map((key) => (
            <li
              key={key}
              className={`flex items-center gap-2 ${features[key] ? "text-slate-700" : "text-slate-300"}`}
            >
              <Icon name={features[key] ? "plus" : "close"} className="h-4 w-4" />
              {FEATURE_LABELS[key]}
            </li>
          ))}
        </ul>
      </section>

      {plan.code === "INTERNAL" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Planuri disponibile</h2>
          <p className="mt-2 text-sm text-slate-500">
            Cont intern — acces complet, fără limite, gestionat de administratorul platformei.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Planuri disponibile</h2>
          <PlanSwitcher plans={plans} currentCode={plan.code} canManage={canManage} />
        </section>
      )}
    </div>
  );
}
