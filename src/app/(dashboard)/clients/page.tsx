import type { Metadata } from "next";
import Link from "next/link";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { listClients, PAGE_SIZE } from "@/lib/crm/queries";
import { partyDisplayName } from "@/lib/crm/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";

export const metadata: Metadata = { title: "Clienți · BusinessPuls" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("business", "read", "CRM");
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = q?.trim() || undefined;
  const canWrite = hasPermission(membership.role, "business", "write");

  const { clients, total } = await listClients(supabase, membership.id, { search, page });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Clienți"
        description="Companiile și persoanele cărora le emiți facturi."
        action={
          canWrite ? (
            <ButtonLink href="/clients/new" size="sm">
              Adaugă client
            </ButtonLink>
          ) : undefined
        }
      />

      <SearchBar defaultValue={search} placeholder="Caută după nume, email sau CUI" />

      {clients.length === 0 ? (
        <EmptyState
          icon="users"
          title={search ? "Niciun client găsit" : "Niciun client încă"}
          description={
            search
              ? "Încearcă alt termen de căutare."
              : "Adaugă primul client ca să poți emite facturi către el."
          }
          action={
            canWrite && !search ? (
              <ButtonLink href="/clients/new" size="sm">
                Adaugă client
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
                <TH>Tip</TH>
                <TH>Oraș</TH>
                <TH>Email</TH>
                <TH className="text-right">Status</TH>
              </tr>
            </THead>
            <TBody>
              {clients.map((client) => (
                <TR key={client.id}>
                  <TD className="font-medium text-text">
                    <Link href={`/clients/${client.id}`} className="hover:underline">
                      {partyDisplayName(client)}
                    </Link>
                  </TD>
                  <TD>{client.type === "COMPANY" ? "Companie" : "Persoană"}</TD>
                  <TD>{client.city ?? "—"}</TD>
                  <TD>{client.email ?? "—"}</TD>
                  <TD className="text-right">
                    {client.isActive ? (
                      <Badge tone="green">Activ</Badge>
                    ) : (
                      <Badge>Inactiv</Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath="/clients"
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            params={{ q: search }}
          />
        </>
      )}
    </div>
  );
}
