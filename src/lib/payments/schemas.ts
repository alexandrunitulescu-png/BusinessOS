import { z } from "zod";
import { CURRENCIES } from "@/lib/organizations/schemas";

export const PAYMENT_METHODS = ["BANK_TRANSFER", "CASH", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Transfer bancar",
  CASH: "Numerar",
  CARD: "Card",
  OTHER: "Altă metodă",
};

export const PAYMENT_TARGETS = ["INVOICE", "EXPENSE"] as const;
export type PaymentTarget = (typeof PAYMENT_TARGETS)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const paymentSchema = z.object({
  targetType: z.enum(PAYMENT_TARGETS),
  targetId: z.string().trim().regex(UUID_RE, "Alege o factură sau o cheltuială"),
  amount: z
    .number({ error: "Suma este obligatorie" })
    .positive("Suma trebuie să fie pozitivă")
    .max(99_999_999),
  currency: z.enum(CURRENCIES),
  paymentDate: z.string().trim().regex(DATE_RE, "Data plății este obligatorie"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
