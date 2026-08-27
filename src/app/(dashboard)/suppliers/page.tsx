import type { Metadata } from "next";
import Link from "next/link";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { listSuppliers, PAGE_SIZE } from "@/lib/crm/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";

export const metadata: Metadata = { title: "Furnizori · BusinessOS" };

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("business", "read", "CRM");
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = q?.trim() || undefined;
  const canWrite = hasPermission(membership.role, "business", "write");

  const { suppliers, total } = await listSuppliers(supabase, membership.id, { search, page });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Furnizori"
        description="Companiile și persoanele de la care înregistrezi cheltuieli."
        action={
          canWrite ? (
            <ButtonLink href="/suppliers/new" size="sm">
              Adaugă furnizor
            </ButtonLink>
          ) : undefined
        }
      />

      <SearchBar defaultValue={search} placeholder="Caută după nume, contact sau CUI" />

      {suppliers.length === 0 ? (
        <EmptyState
          icon="truck"
          title={search ? "Niciun furnizor găsit" : "Niciun furnizor încă"}
          description={
            search
              ? "Încearcă alt termen de căutare."
              : "Adaugă primul furnizor ca să poți lega cheltuielile de el."
          }
          action={
            canWrite && !search ? (
              <ButtonLink href="/suppliers/new" size="sm">
                Adaugă furnizor
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
                <TH>CUI</TH>
                <TH>Oraș</TH>
                <TH>Email</TH>
                <TH className="text-right">Status</TH>
              </tr>
            </THead>
            <TBody>
              {suppliers.map((supplier) => (
                <TR key={supplier.id}>
                  <TD className="font-medium text-slate-900">
                    <Link href={`/suppliers/${supplier.id}`} className="hover:underline">
                      {supplier.companyName}
                    </Link>
                  </TD>
                  <TD>{supplier.cui ?? "—"}</TD>
                  <TD>{supplier.city ?? "—"}</TD>
                  <TD>{supplier.email ?? "—"}</TD>
                  <TD className="text-right">
                    {supplier.isActive ? (
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
            basePath="/suppliers"
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
