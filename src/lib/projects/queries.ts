import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectStatus } from "@/lib/projects/schemas";
import type { Project, ProjectListItem } from "@/lib/projects/types";

export const PAGE_SIZE = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
type Row = Record<string, unknown>;

function num(v: unknown): number | null {
  return v === null || v === undefined || v === "" ? null : Number(v);
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function clientRowName(client: Row | null): string | null {
  if (!client) return null;
  if (client.type === "PERSON") {
    return (
      [str(client.first_name), str(client.last_name)].filter(Boolean).join(" ") || "Persoană"
    );
  }
  return str(client.company_name) || "Companie";
}

function mapProject(row: Row): ProjectListItem {
  const client = (row.client as Row | null) ?? null;
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    clientId: str(row.client_id),
    description: str(row.description),
    status: (row.status as ProjectStatus) ?? "PLANNED",
    startDate: str(row.start_date),
    deadline: str(row.deadline),
    budget: num(row.budget),
    currency: str(row.currency),
    clientName: clientRowName(client),
  };
}

function likeTerm(search: string): string {
  return `%${search.replace(/[,()*%\\]/g, " ").trim()}%`;
}

const SELECT =
  "*, client:clients(id, type, company_name, first_name, last_name)";

export async function listProjects(
  supabase: Db,
  organizationId: string,
  {
    search,
    page = 1,
    status,
  }: { search?: string; page?: number; status?: ProjectStatus } = {},
) {
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from("projects")
    .select(SELECT, { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status) query = query.eq("status", status);

  const term = search?.trim();
  if (term) query = query.or(`name.ilike.${likeTerm(term)},description.ilike.${likeTerm(term)}`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { projects: (data ?? []).map(mapProject), total: count ?? 0 };
}

/** Lightweight {id, name} list for select inputs (no pagination). */
export async function listProjectOptions(
  supabase: Db,
  organizationId: string,
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("organization_id", organizationId)
    .not("status", "in", "(COMPLETED,CANCELLED)")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: Row) => ({ id: r.id as string, name: (r.name as string) ?? "" }));
}

export async function getProject(
  supabase: Db,
  organizationId: string,
  id: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(SELECT)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProject(data) : null;
}
