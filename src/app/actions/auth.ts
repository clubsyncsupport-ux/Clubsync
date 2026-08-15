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

export type ResetRequestState = { error: string | null; devResetUrl?: string };

export async function requestPasswordResetAction(_prev: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };
  const result = await authProvider.requestPasswordReset(email);
  if (!result.ok) return { error: result.error };
  return { error: null, devResetUrl: result.devResetUrl };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (password !== confirm) return { error: "Passwords don't match." };

  const result = await authProvider.resetPassword(token, password);
  if (!result.ok) return { error: result.error };
  redirect("/login");
}
