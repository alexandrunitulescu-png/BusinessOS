import { z } from "zod";
import { CURRENCIES } from "@/lib/organizations/schemas";

export const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Neplătită",
  PARTIALLY_PAID: "Parțial plătită",
  PAID: "Plătită",
};

/** Suggested categories; the field is free text so anything else is fine too. */
export const EXPENSE_CATEGORIES = [
  "Chirie",
  "Utilități",
  "Consumabile",
  "Servicii",
  "Transport",
  "Marketing",
  "Taxe și impozite",
  "Software",
  "Echipamente",
  "Comisioane bancare",
  "Altele",
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || UUID_RE.test(v), "Valoare invalidă");

export const expenseSchema = z.object({
  supplierId: optionalUuid,
  projectId: optionalUuid,
  expenseDate: z.string().trim().regex(DATE_RE, "Data cheltuielii este obligatorie"),
  category: z.string().trim().max(60).optional(),
  description: z.string().trim().max(500).optional(),
  amount: z
    .number({ error: "Suma este obligatorie" })
    .positive("Suma trebuie să fie pozitivă")
    .max(99_999_999),
  vatAmount: z
    .number({ error: "TVA-ul este obligatoriu" })
    .min(0, "TVA-ul nu poate fi negativ")
    .max(99_999_999),
  currency: z.enum(CURRENCIES),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
