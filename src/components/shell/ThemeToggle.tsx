"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/shell/icons";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    mq.removeEventListener("change", onChange);
  };
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  // 1 year, lax — read back server-side in `getThemePreference()` so SSR matches.
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  listeners.forEach((l) => l());
}

/** Row for the user menu: flips between light and dark, persisted in a cookie. */
export function ThemeToggle({ onToggle }: { onToggle?: () => void }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setTheme(next);
        onToggle?.();
      }}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-sunken hover:text-text"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
      {theme === "dark" ? "Mod luminos" : "Mod întunecat"}
    </button>
  );
}
