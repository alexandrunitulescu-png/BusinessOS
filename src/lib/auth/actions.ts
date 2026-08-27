"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/auth/schemas";
import { ACTIVE_ORG_COOKIE } from "@/lib/organizations/constants";
import { cookies } from "next/headers";
import { getClientIp } from "@/lib/security/request";
import { checkRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";

export type AuthActionState = {
  error: string | null;
  message?: string | null;
};

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }

  const supabase = await createClient();

  const ip = await getClientIp();
  const limit = await checkRateLimit(supabase, "auth:signin", ip);
  if (!limit.allowed) {
    return { error: rateLimitMessage(limit.retryAfterSeconds) };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Email sau parolă incorectă." };
  }

  redirect("/");
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  const ip = await getClientIp();
  const limit = await checkRateLimit(supabase, "auth:signup", ip);
  if (!limit.allowed) {
    return { error: rateLimitMessage(limit.retryAfterSeconds) };
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Email confirmation may be required depending on the project's Auth
  // settings — session is null in that case until the user clicks the link.
  if (!data.session) {
    return {
      error: null,
      message: "Ți-am trimis un email de confirmare. Verifică-ți inboxul.",
    };
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORG_COOKIE);
  redirect("/login");
}
