import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Rapoarte · BusinessOS" };

export default async function ReportsPage() {
  await requirePageAccess("money");
  return (
    <ComingSoon
      title="Rapoarte"
      milestone="M8"
      description="Rapoarte de bază peste facturi, cheltuieli și încasări."
    />
  );
}
