import type { Metadata } from "next";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign Up" };

export default function SignUpPage() {
  return <SignUpForm />;
}
