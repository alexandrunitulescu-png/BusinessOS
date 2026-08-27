import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Facturi · BusinessOS" };

export default async function InvoicesPage() {
  await requirePageAccess("money");
  return (
    <ComingSoon
      title="Facturi"
      milestone="M5"
      description="Emite facturi cu calcule deterministe, generează PDF și urmărește statusul."
    />
  );
}
