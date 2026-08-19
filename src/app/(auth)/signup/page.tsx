import type { Metadata } from "next";
import { SignUpForm } from "./signup-form";
import { resolveGoogleAuthError } from "@/lib/google-auth-errors";

export const metadata: Metadata = { title: "Sign Up" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <SignUpForm initialError={resolveGoogleAuthError(error)} />;
}
