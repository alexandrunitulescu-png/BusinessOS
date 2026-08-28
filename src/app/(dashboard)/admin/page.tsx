import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { listAllOrganizations } from "@/lib/admin/queries";
import { SUBSCRIPTION_STATUS_LABELS, type AnyPlanCode } from "@/lib/billing/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { OrgPlanSelect } from "@/components/admin/OrgPlanSelect";

export const metadata: Metadata = { title: "Admin platformă · BusinessPuls" };

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ro-RO", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase } = await requirePlatformAdmin();
  const { q } = await searchParams;
  const search = q?.trim() || undefined;

  const orgs = await listAllOrganizations(supabase, search);
  const internalCount = orgs.filter((o) => o.planCode === "INTERNAL").length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader
        title="Admin platformă"
        description={`${orgs.length} organizații${internalCount ? ` · ${internalCount} pe plan intern` : ""}. Schimbă planul oricărei organizații — inclusiv „INTERNAL" (gratuit, nelimitat).`}
      />

      <SearchBar defaultValue={search} placeholder="Caută după denumire, CUI sau email" />

      {orgs.length === 0 ? (
        <EmptyState
          icon="shield"
          title={search ? "Nicio organizație găsită" : "Nicio organizație"}
          description={search ? "Încearcă alt termen." : "Nu există încă organizații înregistrate."}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Organizație</TH>
              <TH>CUI</TH>
              <TH>Proprietar</TH>
              <TH>Status</TH>
              <TH>Creat</TH>
              <TH>Plan</TH>
            </tr>
          </THead>
          <TBody>
            {orgs.map((o) => (
              <TR key={o.id}>
                <TD className="font-medium text-text">{o.tradeName || o.legalName}</TD>
                <TD>{o.cui ?? "—"}</TD>
                <TD>
                  <span className="block">{o.ownerEmail ?? "—"}</span>
                  {o.ownerName && <span className="block text-xs text-text-subtle">{o.ownerName}</span>}
                </TD>
                <TD>
                  <Badge tone={o.subscriptionStatus === "ACTIVE" ? "green" : "amber"}>
                    {SUBSCRIPTION_STATUS_LABELS[o.subscriptionStatus ?? ""] ?? o.subscriptionStatus ?? "—"}
                  </Badge>
                </TD>
                <TD className="text-text-muted">{fmtDate(o.createdAt)}</TD>
                <TD>
                  <OrgPlanSelect
                    organizationId={o.id}
                    currentCode={(o.planCode as AnyPlanCode) ?? null}
                  />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
