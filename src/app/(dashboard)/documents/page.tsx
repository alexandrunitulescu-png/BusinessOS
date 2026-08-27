import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Documente · BusinessOS" };

export default async function DocumentsPage() {
  await requirePageAccess("catalog");
  return (
    <ComingSoon
      title="Documente"
      milestone="M8"
      description="Toate documentele atașate facturilor, cheltuielilor, clienților și proiectelor."
    />
  );
}
