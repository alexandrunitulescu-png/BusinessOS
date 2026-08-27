import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Angajați · BusinessOS" };

export default async function EmployeesPage() {
  await requirePageAccess("employees");
  return (
    <ComingSoon
      title="Angajați"
      milestone="M8"
      description="Evidență minimă a angajaților — date de contact și funcție, fără salarizare."
    />
  );
}
