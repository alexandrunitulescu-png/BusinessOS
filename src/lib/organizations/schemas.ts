import { z } from "zod";

export const ENTITY_TYPES = [
  "PFA",
  "II",
  "IF",
  "SRL",
  "SA",
  "LIBERAL_PROFESSION",
  "OTHER",
] as const;

export const CURRENCIES = ["RON", "EUR", "USD", "GBP"] as const;

/**
 * CUI here is a light format check only (non-empty, digits, optional RO
 * prefix). The real validation (mod-11 checksum) belongs to the Romania
 * country module (M0 §11) once that's built — not invented here.
 */
const cuiSchema = z
  .string()
  .trim()
  .min(2, "CUI-ul este prea scurt")
  .max(15, "CUI-ul este prea lung")
  .regex(/^(RO)?\d{2,10}$/i, "CUI-ul trebuie să conțină doar cifre (opțional prefixat cu RO)");

export const onboardingSchema = z
  .object({
    // Step 1
    entityType: z.enum(ENTITY_TYPES),
    // Step 2
    legalName: z.string().trim().min(2, "Denumirea este obligatorie"),
    tradeName: z.string().trim().optional(),
    cui: cuiSchema,
    registrationNumber: z.string().trim().optional(),
    addressLine: z.string().trim().min(1, "Adresa este obligatorie"),
    city: z.string().trim().min(1, "Orașul este obligatoriu"),
    county: z.string().trim().min(1, "Județul este obligatoriu"),
    postalCode: z.string().trim().optional(),
    // Step 3
    vatRegistered: z.boolean(),
    vatCode: z.string().trim().optional(),
    defaultCurrency: z.enum(CURRENCIES),
    invoiceSeries: z
      .string()
      .trim()
      .min(1, "Seria este obligatorie")
      .max(10, "Seria e prea lungă")
      .regex(/^[A-Z0-9-]+$/i, "Doar litere, cifre și liniuță"),
    invoiceNextNumber: z.number().int().min(1, "Numărul trebuie să fie cel puțin 1"),
    // Step 4
    iban: z.string().trim().optional(),
    bankName: z.string().trim().optional(),
  })
  .refine((data) => !data.vatRegistered || !!data.vatCode, {
    message: "Codul de TVA este obligatoriu pentru o firmă plătitoare de TVA",
    path: ["vatCode"],
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const STEP_FIELDS: Record<number, (keyof OnboardingInput)[]> = {
  1: ["entityType"],
  2: ["legalName", "tradeName", "cui", "registrationNumber", "addressLine", "city", "county", "postalCode"],
  3: ["vatRegistered", "vatCode", "defaultCurrency", "invoiceSeries", "invoiceNextNumber"],
  4: ["iban", "bankName"],
};

export const TOTAL_STEPS = 5;
