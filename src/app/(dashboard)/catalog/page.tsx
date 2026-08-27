import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Produse & servicii · BusinessOS" };

export default async function CatalogPage() {
  await requirePageAccess("catalog");
  return (
    <ComingSoon
      title="Produse & servicii"
      milestone="M3"
      description="Catalogul de produse și servicii pe care le adaugi pe facturi."
    />
  );
}
