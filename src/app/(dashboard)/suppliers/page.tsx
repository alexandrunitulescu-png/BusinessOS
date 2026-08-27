import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Furnizori · BusinessOS" };

export default async function SuppliersPage() {
  await requirePageAccess("business");
  return (
    <ComingSoon
      title="Furnizori"
      milestone="M3"
      description="Evidența furnizorilor și a datelor lor de contact și facturare."
    />
  );
}
