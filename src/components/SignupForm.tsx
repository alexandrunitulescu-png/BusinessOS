"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = { error: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  if (state.message) {
    return <p className="text-sm text-text">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="text-base font-semibold text-text">Creează cont</h1>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-text">Nume complet</span>
        <input
          name="fullName"
          type="text"
          required
          autoComplete="name"
          className="rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text outline-none focus:border-brand"
        />
      </label>

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
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text outline-none focus:border-brand"
        />
      </label>

      {state.error && <p className="text-sm text-critical">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Se creează contul…" : "Creează cont"}
      </button>

      <p className="text-center text-sm text-text-muted">
        Ai deja cont?{" "}
        <Link href="/login" className="font-medium text-text underline">
          Autentifică-te
        </Link>
      </p>
    </form>
  );
}
