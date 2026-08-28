"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="text-base font-semibold text-text">Autentificare</h1>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-text">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-text">Parolă</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text outline-none focus:border-brand"
        />
      </label>

      {state.error && <p className="text-sm text-critical">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Se conectează…" : "Conectează-te"}
      </button>

      <p className="text-center text-sm text-text-muted">
        Nu ai cont?{" "}
        <Link href="/signup" className="font-medium text-text underline">
          Creează unul
        </Link>
      </p>
    </form>
  );
}
