import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Clienți · BusinessOS" };

export default async function ClientsPage() {
  await requirePageAccess("business");
  return (
    <ComingSoon
      title="Clienți"
      milestone="M3"
      description="Gestionează clienții, datele lor de facturare și istoricul comenzilor."
    />
  );
}
