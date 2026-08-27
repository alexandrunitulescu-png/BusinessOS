import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Item } from "@/lib/catalog/types";

export const PAGE_SIZE = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

function mapItem(row: Row): Item {
  return {
    id: row.id as string,
    type: row.type as Item["type"],
    name: (row.name as string) ?? "",
    description: typeof row.description === "string" && row.description ? row.description : null,
    sku: typeof row.sku === "string" && row.sku ? row.sku : null,
    unit: (row.unit as string) ?? "buc",
    price: Number(row.price ?? 0),
    currency: (row.currency as string) ?? "RON",
    vatRate: Number(row.vat_rate ?? 0),
    isActive: row.is_active !== false,
  };
}

function likeTerm(search: string): string {
  return `%${search.replace(/[,()*%\\]/g, " ").trim()}%`;
}

export async function listItems(
  supabase: Db,
  organizationId: string,
  { search, page = 1 }: { search?: string; page?: number } = {},
) {
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from("products_services")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const term = search?.trim();
  if (term) {
    query = query.or(`name.ilike.${likeTerm(term)},sku.ilike.${likeTerm(term)}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: (data ?? []).map(mapItem), total: count ?? 0 };
}

export async function getItem(
  supabase: Db,
  organizationId: string,
  id: string,
): Promise<Item | null> {
  const { data, error } = await supabase
    .from("products_services")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapItem(data) : null;
}
