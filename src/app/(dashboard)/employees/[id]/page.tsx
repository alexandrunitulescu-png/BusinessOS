import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getEmployee } from "@/lib/employees/queries";
import { deleteEmployeeAction } from "@/lib/employees/mutations";
import { employeeFullName } from "@/lib/employees/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { DeleteButton } from "@/components/ui/DeleteButton";

export const metadata: Metadata = { title: "Angajat · BusinessPuls" };

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requirePageAccess("employees", "read", "EMPLOYEES");
  const { id } = await params;

  const employee = await getEmployee(supabase, membership.id, id);
  if (!employee) notFound();

  const canWrite = hasPermission(membership.role, "employees", "write");
  const canDelete = hasPermission(membership.role, "employees", "delete");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={employeeFullName(employee)}
        description={canWrite ? "Editează datele angajatului." : "Detalii angajat."}
      />
      <EmployeeForm
        employee={employee}
        defaultCurrency={membership.defaultCurrency}
        readOnly={!canWrite}
      />

      {canDelete && (
        <div className="border-t border-border pt-5">
          <p className="mb-2 text-sm font-medium text-text">Șterge angajatul</p>
          <p className="mb-3 text-sm text-text-muted">
            Acțiunea este permanentă și elimină toate datele acestei persoane din evidență.
          </p>
          <DeleteButton
            action={deleteEmployeeAction.bind(null, employee.id)}
            label="Șterge angajatul"
          />
        </div>
      )}
    </div>
  );
}
