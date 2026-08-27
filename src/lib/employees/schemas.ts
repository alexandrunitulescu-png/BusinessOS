import { z } from "zod";
import { CURRENCIES } from "@/lib/organizations/schemas";
import { validateRomanianCnp } from "@/lib/country/romania";

export const EMPLOYEE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: "Activ",
  INACTIVE: "Inactiv",
};

export const CONTRACT_TYPES = [
  "CIM_NEDETERMINAT",
  "CIM_DETERMINAT",
  "PART_TIME",
  "INTERNSHIP",
  "COLABORARE",
  "ALT",
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  CIM_NEDETERMINAT: "CIM — perioadă nedeterminată",
  CIM_DETERMINAT: "CIM — perioadă determinată",
  PART_TIME: "Timp parțial",
  INTERNSHIP: "Internship / practică",
  COLABORARE: "Contract de colaborare",
  ALT: "Alt tip",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const optionalDate = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || DATE_RE.test(v), "Dată invalidă");

const optionalText = z.string().trim().optional();

export const employeeSchema = z
  .object({
    firstName: z.string().trim().min(1, "Prenumele este obligatoriu").max(100),
    lastName: z.string().trim().min(1, "Numele este obligatoriu").max(100),
    email: z.string().trim().email("Email invalid").optional().or(z.literal("")),
    phone: optionalText,
    jobTitle: optionalText,
    department: optionalText,
    status: z.enum(EMPLOYEE_STATUSES),
    hireDate: optionalDate,
    cnp: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || validateRomanianCnp(v).valid, "CNP invalid"),
    contractType: z.enum(CONTRACT_TYPES).optional().or(z.literal("")),
    contractStartDate: optionalDate,
    contractEndDate: optionalDate,
    baseSalary: z
      .number()
      .min(0, "Salariul nu poate fi negativ")
      .max(99_999_999, "Valoare prea mare")
      .optional(),
    salaryCurrency: z.enum(CURRENCIES),
    iban: optionalText,
    notes: optionalText,
  })
  .refine(
    (d) => !d.contractStartDate || !d.contractEndDate || d.contractStartDate <= d.contractEndDate,
    { path: ["contractEndDate"], message: "Sfârșitul contractului nu poate fi înaintea începutului" },
  );

export type EmployeeInput = z.infer<typeof employeeSchema>;
