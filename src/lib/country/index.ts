import type { CountryModule } from "@/lib/country/types";
import { RomaniaModule } from "@/lib/country/romania";

const MODULES: Record<string, CountryModule> = {
  RO: RomaniaModule,
};

/** Resolves the country module for `organizations.country`; null if unsupported. */
export function getCountryModule(code: string | null | undefined): CountryModule | null {
  if (!code) return null;
  return MODULES[code.toUpperCase()] ?? null;
}

export type { CountryModule } from "@/lib/country/types";
