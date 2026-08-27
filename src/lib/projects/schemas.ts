import { z } from "zod";
import { CURRENCIES } from "@/lib/organizations/schemas";

export const PROJECT_STATUSES = [
  "PLANNED",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: "Planificat",
  ACTIVE: "Activ",
  ON_HOLD: "În așteptare",
  COMPLETED: "Finalizat",
  CANCELLED: "Anulat",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const optionalDate = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || DATE_RE.test(v), "Dată invalidă");

export const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Numele proiectului este obligatoriu").max(200),
    clientId: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || UUID_RE.test(v), "Client invalid"),
    description: z.string().trim().optional(),
    status: z.enum(PROJECT_STATUSES),
    startDate: optionalDate,
    deadline: optionalDate,
    budget: z
      .number()
      .min(0, "Bugetul nu poate fi negativ")
      .max(99_999_999, "Buget prea mare")
      .optional(),
    currency: z.enum(CURRENCIES),
  })
  .refine(
    (d) => !d.startDate || !d.deadline || d.startDate <= d.deadline,
    { path: ["deadline"], message: "Termenul nu poate fi înaintea datei de început" },
  );

export type ProjectInput = z.infer<typeof projectSchema>;
