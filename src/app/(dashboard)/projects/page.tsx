import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Proiecte · BusinessOS" };

export default async function ProjectsPage() {
  await requirePageAccess("business");
  return (
    <ComingSoon
      title="Proiecte"
      milestone="M4"
      description="Organizează munca pe proiecte și leagă-le de clienți și facturi."
    />
  );
}
