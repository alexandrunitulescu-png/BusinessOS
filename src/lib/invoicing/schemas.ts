import { z } from "zod";
import { CURRENCIES } from "@/lib/organizations/schemas";

export const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Ciornă",
  ISSUED: "Emisă",
  SENT: "Trimisă",
  PARTIALLY_PAID: "Parțial încasată",
  PAID: "Încasată",
  OVERDUE: "Scadentă",
  CANCELLED: "Anulată",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const uuidField = (msg: string) => z.string().trim().regex(UUID_RE, msg);
const optionalUuid = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || UUID_RE.test(v), "Valoare invalidă");
const optionalDate = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || DATE_RE.test(v), "Dată invalidă");

export const invoiceLineSchema = z.object({
  productServiceId: optionalUuid,
  description: z.string().trim().min(1, "Descrierea este obligatorie").max(500),
  quantity: z
    .number({ error: "Cantitatea este obligatorie" })
    .positive("Cantitatea trebuie să fie pozitivă")
    .max(9_999_999),
  unit: z.string().trim().min(1, "Unitatea este obligatorie").max(20),
  unitPrice: z
    .number({ error: "Prețul este obligatoriu" })
    .min(0, "Prețul nu poate fi negativ")
    .max(99_999_999),
  vatRate: z.number().min(0, "Cota TVA nu poate fi negativă").max(100),
  discountPercent: z.number().min(0).max(100, "Discount-ul nu poate depăși 100%"),
});

export const invoiceDraftSchema = z
  .object({
    clientId: uuidField("Alege un client"),
    projectId: optionalUuid,
    seriesId: uuidField("Alege o serie de facturare"),
    issueDate: z.string().trim().regex(DATE_RE, "Data emiterii este obligatorie"),
    dueDate: optionalDate,
    currency: z.enum(CURRENCIES),
    exchangeRate: z
      .number()
      .positive("Cursul trebuie să fie pozitiv")
      .max(1_000_000)
      .optional(),
    paymentTerms: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(2000).optional(),
    lines: z.array(invoiceLineSchema).min(1, "Factura trebuie să aibă cel puțin o linie"),
  })
  .refine((d) => !d.dueDate || d.dueDate >= d.issueDate, {
    path: ["dueDate"],
    message: "Scadența nu poate fi înaintea datei emiterii",
  });

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
export type InvoiceDraftInput = z.infer<typeof invoiceDraftSchema>;

/** Status changes the app allows after issuing (payments handle the rest in M6). */
export const MANUAL_STATUS_TRANSITIONS: Partial<Record<InvoiceStatus, InvoiceStatus[]>> = {
  ISSUED: ["SENT", "CANCELLED"],
  SENT: ["CANCELLED"],
  OVERDUE: ["SENT", "CANCELLED"],
};
