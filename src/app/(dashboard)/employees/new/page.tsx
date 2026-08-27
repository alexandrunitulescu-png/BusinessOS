import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmployeeForm } from "@/components/employees/EmployeeForm";

export const metadata: Metadata = { title: "Angajat nou · BusinessPuls" };

export default async function NewEmployeePage() {
  const { membership } = await requirePageAccess("employees", "write", "EMPLOYEES");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Angajat nou" description="Adaugă o persoană în evidența personalului." />
      <EmployeeForm defaultCurrency={membership.defaultCurrency} />
    </div>
  );
}
