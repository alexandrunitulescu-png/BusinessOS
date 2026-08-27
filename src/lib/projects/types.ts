import type { ProjectStatus } from "@/lib/projects/schemas";

export type Project = {
  id: string;
  name: string;
  clientId: string | null;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  deadline: string | null;
  budget: number | null;
  currency: string | null;
};

/** Project row plus the linked client's display name, for list views. */
export type ProjectListItem = Project & { clientName: string | null };
