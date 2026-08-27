import { z } from "zod";

/** A client or supplier is either a company or a natural person. */
export const PARTY_TYPES = ["COMPANY", "PERSON"] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

const optionalText = z.string().trim().optional();

/** Optional string that, when non-empty, must satisfy `check`. */
function optionalMatching(check: z.ZodType<string>, message: string) {
  return z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || check.safeParse(v).success, message);
}

const optionalEmail = optionalMatching(z.string().email(), "Adresă de email invalidă");

/**
 * Light CUI format check only (digits, optional RO prefix) — the real mod-11
 * checksum belongs to the Romania country module (M0 §11), not invented here.
 */
const optionalCui = optionalMatching(
  z.string().regex(/^(RO)?\d{2,10}$/i),
  "CUI invalid (doar cifre, opțional prefixat cu RO)",
);

const optionalIban = optionalMatching(
  z.string().regex(/^[A-Za-z]{2}\d{2}[A-Za-z0-9]{10,30}$/),
  "IBAN invalid",
);

const partyBase = {
  cui: optionalCui,
  registrationNumber: optionalText,
  contactPerson: optionalText,
  email: optionalEmail,
  phone: optionalText,
  addressLine: optionalText,
  city: optionalText,
  county: optionalText,
  country: z.string().trim().min(1, "Țara este obligatorie"),
  iban: optionalIban,
  notes: optionalText,
  isActive: z.boolean(),
};

export const clientSchema = z
  .object({
    type: z.enum(PARTY_TYPES),
    companyName: optionalText,
    firstName: optionalText,
    lastName: optionalText,
    ...partyBase,
  })
  .superRefine((data, ctx) => {
    if (data.type === "COMPANY" && !data.companyName) {
      ctx.addIssue({
        code: "custom",
        path: ["companyName"],
        message: "Denumirea companiei este obligatorie",
      });
    }
    if (data.type === "PERSON") {
      if (!data.firstName)
        ctx.addIssue({ code: "custom", path: ["firstName"], message: "Prenumele este obligatoriu" });
      if (!data.lastName)
        ctx.addIssue({ code: "custom", path: ["lastName"], message: "Numele este obligatoriu" });
    }
  });

export const supplierSchema = z.object({
  type: z.enum(PARTY_TYPES),
  companyName: z.string().trim().min(1, "Denumirea furnizorului este obligatorie"),
  ...partyBase,
});

export type ClientInput = z.infer<typeof clientSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
