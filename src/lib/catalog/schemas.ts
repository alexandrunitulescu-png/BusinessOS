import { z } from "zod";
import { CURRENCIES } from "@/lib/organizations/schemas";

export const ITEM_TYPES = ["SERVICE", "PRODUCT"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/** Common units of measure; free text is still allowed on the input. */
export const UNITS = ["buc", "oră", "zi", "lună", "proiect", "set", "kg", "m", "mp", "l"] as const;

export const itemSchema = z.object({
  type: z.enum(ITEM_TYPES),
  name: z.string().trim().min(1, "Numele este obligatoriu").max(200),
  description: z.string().trim().optional(),
  sku: z.string().trim().max(60).optional(),
  unit: z.string().trim().min(1, "Unitatea este obligatorie").max(20),
  price: z
    .number({ error: "Prețul este obligatoriu" })
    .min(0, "Prețul nu poate fi negativ")
    .max(99_999_999, "Preț prea mare"),
  currency: z.enum(CURRENCIES),
  vatRate: z
    .number({ error: "Cota TVA este obligatorie" })
    .min(0, "Cota TVA nu poate fi negativă")
    .max(100, "Cota TVA nu poate depăși 100%"),
  isActive: z.boolean(),
});

export type ItemInput = z.infer<typeof itemSchema>;
