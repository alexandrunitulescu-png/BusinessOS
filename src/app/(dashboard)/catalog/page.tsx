import type { Metadata } from "next";
import Link from "next/link";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { listItems, PAGE_SIZE } from "@/lib/catalog/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { formatMoney, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Produse & servicii · BusinessOS" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("catalog", "read", "CRM");
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = q?.trim() || undefined;
  const canWrite = hasPermission(membership.role, "catalog", "write");

  const { items, total } = await listItems(supabase, membership.id, { search, page });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Produse & servicii"
        description="Catalogul din care alegi liniile de pe facturi."
        action={
          canWrite ? (
            <ButtonLink href="/catalog/new" size="sm">
              Adaugă
            </ButtonLink>
          ) : undefined
        }
      />

      <SearchBar defaultValue={search} placeholder="Caută după nume sau cod" />

      {items.length === 0 ? (
        <EmptyState
          icon="tag"
          title={search ? "Niciun rezultat" : "Catalog gol"}
          description={
            search
              ? "Încearcă alt termen de căutare."
              : "Adaugă produsele și serviciile pe care le facturezi frecvent."
          }
          action={
            canWrite && !search ? (
              <ButtonLink href="/catalog/new" size="sm">
                Adaugă
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
                <TH className="text-right">Preț</TH>
                <TH className="text-right">TVA</TH>
                <TH>Unitate</TH>
                <TH className="text-right">Status</TH>
              </tr>
            </THead>
            <TBody>
              {items.map((item) => (
                <TR key={item.id}>
                  <TD className="font-medium text-slate-900">
                    <Link href={`/catalog/${item.id}`} className="hover:underline">
                      {item.name}
                    </Link>
                  </TD>
                  <TD>{item.type === "PRODUCT" ? "Produs" : "Serviciu"}</TD>
                  <TD className="text-right tabular-nums">
                    {formatMoney(item.price, item.currency)}
                  </TD>
                  <TD className="text-right tabular-nums">{formatNumber(item.vatRate)}%</TD>
                  <TD>{item.unit}</TD>
                  <TD className="text-right">
                    {item.isActive ? <Badge tone="green">Activ</Badge> : <Badge>Inactiv</Badge>}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath="/catalog"
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
