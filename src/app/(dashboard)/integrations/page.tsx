import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { getTaxIntegration } from "@/lib/efactura/queries";
import { getOrganizationBillingInfo } from "@/lib/organizations/queries";
import { getCountryModule } from "@/lib/country";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Integrări · BusinessPuls" };

const STATUS_LABELS: Record<string, string> = {
  NOT_CONNECTED: "Neconectat",
  PENDING: "În curs de conectare",
  CONNECTED: "Conectat",
  EXPIRED: "Expirat",
  REVOKED: "Revocat",
};

export default async function IntegrationsPage() {
  const { supabase, membership } = await requirePageAccess("settings", "read", "EFACTURA");

  const [integration, org] = await Promise.all([
    getTaxIntegration(supabase, membership.id),
    getOrganizationBillingInfo(supabase, membership.id),
  ]);
  const country = getCountryModule(org?.country);
  const provider = country?.getEInvoiceProvider() ?? null;
  const status = integration?.status ?? "NOT_CONNECTED";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader
        title="Integrări"
        description="Conexiuni către servicii externe."
      />

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text">ANAF e-Factura</h2>
            <p className="mt-0.5 text-sm text-text-muted">
              Trimiterea electronică a facturilor către SPV.
            </p>
          </div>
          <Badge tone={status === "CONNECTED" ? "green" : "neutral"}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
        </div>

        <div className="mt-4 rounded-lg bg-surface-sunken p-3 text-sm text-text-muted">
          {country ? (
            <>
              Modul fiscal: <span className="font-medium">{country.code}</span>. Provider e-Factura:{" "}
              <span className="font-medium">{provider?.name ?? "indisponibil"}</span>.
            </>
          ) : (
            <>Organizația nu are o țară cu modul de e-Factura.</>
          )}
        </div>

        <button
          type="button"
          disabled
          title="Se activează după configurarea conform documentației oficiale ANAF"
          className="mt-4 inline-flex cursor-not-allowed items-center rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white opacity-50"
        >
          Conectează la ANAF
        </button>
        <p className="mt-2 text-xs text-text-subtle">
          Conectarea (autentificare SPV, upload, verificare status) se implementează pe baza
          documentației oficiale ANAF. Între timp, fiecare factură emisă poate genera XML-ul UBL de
          pe pagina ei, pentru încărcare manuală în SPV.
        </p>
      </section>
    </div>
  );
}
