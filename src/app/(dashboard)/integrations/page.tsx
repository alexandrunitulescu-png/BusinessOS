import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Integrări · BusinessOS" };

export default async function IntegrationsPage() {
  await requirePageAccess("settings");
  return (
    <ComingSoon
      title="Integrări"
      milestone="M9"
      description="Webhooks și conectori pentru a lega BusinessOS de alte aplicații."
    />
  );
}
