import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Cheltuieli · BusinessOS" };

export default async function ExpensesPage() {
  await requirePageAccess("money");
  return (
    <ComingSoon
      title="Cheltuieli"
      milestone="M6"
      description="Înregistrează cheltuielile, atașează documente și urmărește plata lor."
    />
  );
}
