"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/shell/icons";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { signOutAction } from "@/lib/auth/actions";

export function UserMenu({ email, orgName }: { email: string; orgName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initial = email.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md p-0.5 pr-1.5 hover:bg-surface-sunken"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-sunken text-xs font-semibold text-text-muted">
          {initial}
        </span>
        <Icon name="chevron-down" className="h-4 w-4 text-text-subtle" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1.5 w-60 overflow-hidden rounded-lg border border-border bg-surface-overlay shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium text-text">{email}</p>
            <p className="truncate text-xs text-text-muted">{orgName}</p>
          </div>
          <ThemeToggle onToggle={() => setOpen(false)} />
          <form action={signOutAction} className="border-t border-border">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-sunken hover:text-text"
            >
              <Icon name="logout" className="h-4 w-4" />
              Ieși din cont
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
