import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { resolveGoogleAuthError } from "@/lib/google-auth-errors";

export const metadata: Metadata = { title: "Log In" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginForm initialError={resolveGoogleAuthError(error)} />;
}
