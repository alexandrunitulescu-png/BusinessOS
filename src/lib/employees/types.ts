import type { ContractType, EmployeeStatus } from "@/lib/employees/schemas";

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  status: EmployeeStatus;
  hireDate: string | null;
  cnp: string | null;
  contractType: ContractType | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  baseSalary: number | null;
  salaryCurrency: string | null;
  iban: string | null;
  notes: string | null;
};

/** Columns safe for list views — no CNP, salary or IBAN. */
export type EmployeeListItem = Pick<
  Employee,
  "id" | "firstName" | "lastName" | "jobTitle" | "department" | "contractType" | "status" | "hireDate"
>;

export function employeeFullName(e: { firstName: string; lastName: string }): string {
  return `${e.lastName} ${e.firstName}`.trim();
}
