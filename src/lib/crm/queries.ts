import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, Supplier } from "@/lib/crm/types";

export const PAGE_SIZE = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

type Row = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function mapClient(row: Row): Client {
  return {
    id: row.id as string,
    type: row.type as Client["type"],
    companyName: str(row.company_name),
    firstName: str(row.first_name),
    lastName: str(row.last_name),
    cui: str(row.cui),
    registrationNumber: str(row.registration_number),
    contactPerson: str(row.contact_person),
    email: str(row.email),
    phone: str(row.phone),
    addressLine: str(row.address_line),
    city: str(row.city),
    county: str(row.county),
    country: str(row.country),
    iban: str(row.iban),
    notes: str(row.notes),
    isActive: row.is_active !== false,
  };
}

function mapSupplier(row: Row): Supplier {
  const client = mapClient(row);
  return {
    id: client.id,
    type: client.type,
    companyName: client.companyName ?? "",
    cui: client.cui,
    registrationNumber: client.registrationNumber,
    contactPerson: client.contactPerson,
    email: client.email,
    phone: client.phone,
    addressLine: client.addressLine,
    city: client.city,
    county: client.county,
    country: client.country,
    iban: client.iban,
    notes: client.notes,
    isActive: client.isActive,
  };
}

/** Escapes a user search term for use inside a PostgREST `or(...ilike...)` filter. */
function likeTerm(search: string): string {
  const cleaned = search.replace(/[,()*%\\]/g, " ").trim();
  return `%${cleaned}%`;
}

type ListArgs = { search?: string; page?: number };

async function listParties(
  supabase: Db,
  table: "clients" | "suppliers",
  organizationId: string,
  searchColumns: string[],
  { search, page = 1 }: ListArgs,
) {
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from(table)
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const term = search?.trim();
  if (term) {
    query = query.or(searchColumns.map((c) => `${c}.ilike.${likeTerm(term)}`).join(","));
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function listClients(supabase: Db, organizationId: string, args: ListArgs = {}) {
  const { rows, total } = await listParties(
    supabase,
    "clients",
    organizationId,
    ["company_name", "first_name", "last_name", "email", "cui"],
    args,
  );
  return { clients: rows.map(mapClient), total };
}

/** Lightweight {id, name} list of active clients for select inputs (no pagination). */
export async function listClientOptions(
  supabase: Db,
  organizationId: string,
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, type, company_name, first_name, last_name")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("company_name", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row: Row) => {
    const client = mapClient(row);
    const name =
      client.type === "PERSON"
        ? [client.firstName, client.lastName].filter(Boolean).join(" ") || "Persoană"
        : client.companyName || "Companie";
    return { id: client.id, name };
  });
}

export async function getClient(
  supabase: Db,
  organizationId: string,
  id: string,
): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapClient(data) : null;
}

export async function listSuppliers(supabase: Db, organizationId: string, args: ListArgs = {}) {
  const { rows, total } = await listParties(
    supabase,
    "suppliers",
    organizationId,
    ["company_name", "contact_person", "email", "cui"],
    args,
  );
  return { suppliers: rows.map(mapSupplier), total };
}

export async function getSupplier(
  supabase: Db,
  organizationId: string,
  id: string,
): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSupplier(data) : null;
}
