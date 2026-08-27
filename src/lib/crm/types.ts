import type { PartyType } from "@/lib/crm/schemas";

export type Client = {
  id: string;
  type: PartyType;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  cui: string | null;
  registrationNumber: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  county: string | null;
  country: string | null;
  iban: string | null;
  notes: string | null;
  isActive: boolean;
};

export type Supplier = Omit<Client, "firstName" | "lastName"> & {
  companyName: string;
};

/** Human-readable name for a party regardless of its type. */
export function partyDisplayName(
  party: Pick<Client, "type" | "companyName" | "firstName" | "lastName">,
): string {
  if (party.type === "PERSON") {
    return [party.firstName, party.lastName].filter(Boolean).join(" ") || "Persoană";
  }
  return party.companyName || "Companie";
}
