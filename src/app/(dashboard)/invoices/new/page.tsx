import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { listClientOptions } from "@/lib/crm/queries";
import { listProjectOptions } from "@/lib/projects/queries";
import { listItemOptions } from "@/lib/catalog/queries";
import { listInvoiceSeries } from "@/lib/invoicing/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { InvoiceForm } from "@/components/invoicing/InvoiceForm";

export const metadata: Metadata = { title: "Factură nouă · BusinessOS" };

export default async function NewInvoicePage() {
  const { supabase, membership } = await requirePageAccess("money", "write");

  const [clients, projects, catalog, series] = await Promise.all([
    listClientOptions(supabase, membership.id),
    listProjectOptions(supabase, membership.id),
    listItemOptions(supabase, membership.id),
    listInvoiceSeries(supabase, membership.id),
  ]);

  if (clients.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <PageHeader title="Factură nouă" />
        <EmptyState
          icon="users"
          title="Adaugă întâi un client"
          description="O factură are nevoie de un client. Adaugă unul și revino."
          action={
            <ButtonLink href="/clients/new" size="sm">
              Adaugă client
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const defaultSeries = series.find((s) => s.isDefault) ?? series[0];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Factură nouă"
        description="Pornește ca ciornă. O poți edita până când o emiți."
      />
      <InvoiceForm
        clients={clients}
        projects={projects}
        catalog={catalog}
        series={series}
        defaultSeriesId={defaultSeries?.id ?? ""}
        defaultCurrency={membership.defaultCurrency}
      />
    </div>
  );
}
