import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Încasări & plăți · BusinessOS" };

export default async function PaymentsPage() {
  await requirePageAccess("money");
  return (
    <ComingSoon
      title="Încasări & plăți"
      milestone="M6"
      description="Reconciliază plățile parțiale cu facturile și cheltuielile corespunzătoare."
    />
  );
}
