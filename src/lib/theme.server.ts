import "server-only";
import { cookies } from "next/headers";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

/**
 * Reads the persisted theme choice (set client-side by `ThemeToggle`).
 * Returns `null` when the user hasn't chosen — the CSS then falls back to the
 * `prefers-color-scheme` media query, so both paths render without a flash.
 */
export async function getThemePreference(): Promise<Theme | null> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value === "light" || value === "dark" ? value : null;
}
