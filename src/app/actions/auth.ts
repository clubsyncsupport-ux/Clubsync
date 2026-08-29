"use server";

import { redirect } from "next/navigation";
import { authProvider } from "@/lib/auth";
import { setSessionCookie, clearSessionCookie, getSessionToken } from "@/lib/auth/session";
import { resolveLandingPath } from "@/lib/viewer";

export type FormState = { error: string | null };

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await authProvider.signUp({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) return { error: result.error };

  await setSessionCookie(result.sessionToken, result.expiresAt);
  redirect("/onboarding");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await authProvider.signIn({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) return { error: result.error };

  await setSessionCookie(result.sessionToken, result.expiresAt);
  redirect(await resolveLandingPath(result.user.id));
}

export async function logoutAction() {
  const token = await getSessionToken();
  if (token) await authProvider.signOut(token);
  await clearSessionCookie();
  redirect("/welcome");
}

