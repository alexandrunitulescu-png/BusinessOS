/**
 * Client-safe theme constants. The server-only cookie reader lives in
 * `theme.server.ts` so this module can be imported from client components
 * (`ThemeToggle`) without dragging `next/headers` into the client bundle.
 */

/** Explicit user theme choice. Absence = follow the OS `prefers-color-scheme`. */
export type Theme = "light" | "dark";

export const THEME_COOKIE = "bp_theme";
