"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, { error: null });

  return (
    <div className="flex min-h-dvh flex-col bg-surface-0 px-6 py-10">
      <div className="mx-auto w-full max-w-sm flex-1 animate-fade-in">
        <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
          ← Back to log in
        </Link>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-text-primary">Reset your password</h1>
        <p className="mt-1 text-[15px] text-text-secondary">Enter your email and we&rsquo;ll send you a reset link.</p>

        {state.submitted ? (
          <div className="mt-6 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm text-accent-soft-text">
            <p className="font-medium">Check your email — if an account exists for that address, a reset link is on its way.</p>
          </div>
        ) : (
          <form action={formAction} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <FieldError>{state.error}</FieldError>
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-xs text-text-muted">
          Email not arriving? A club director, your school&rsquo;s ClubSync admin, or ClubSync support (clubsyncsupport@gmail.com) can reset it for you directly.
        </p>
      </div>
    </div>
  );
}
