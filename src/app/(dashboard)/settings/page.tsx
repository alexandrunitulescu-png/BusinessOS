import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Setări · BusinessOS" };

export default async function SettingsPage() {
  await requirePageAccess("settings");
  return (
    <ComingSoon
      title="Setări"
      milestone="un milestone următor"
      description="Datele organizației, utilizatori și roluri, conturi bancare și abonament."
    />
  );
}
