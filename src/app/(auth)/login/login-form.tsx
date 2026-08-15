"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, { error: null });

  return (
    <div className="flex min-h-dvh flex-col bg-surface-0 px-6 py-10">
      <div className="mx-auto w-full max-w-sm flex-1 animate-fade-in">
        <Link href="/welcome" className="text-sm text-text-secondary hover:text-text-primary">
          ← Back
        </Link>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-text-primary">Welcome back</h1>
        <p className="mt-1 text-[15px] text-text-secondary">Log in to see what&rsquo;s happening in your clubs.</p>

        <button
          type="button"
          disabled
          title="Google Sign-In will be available once this app is connected to a Google account. Use email for now."
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-1 px-4 py-2.5 text-[15px] font-medium text-text-muted opacity-60 cursor-not-allowed"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.3-1.7 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3 14.7 2 12 2 6.9 2 2.7 6.2 2.7 11.3S6.9 20.6 12 20.6c6.9 0 9.3-4.8 9.3-7.3 0-.5 0-.9-.1-1.3H12z" />
          </svg>
          Continue with Google
          <span className="ml-1 text-xs">(coming soon)</span>
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-text-muted">
          <div className="h-px flex-1 bg-border" />
          or continue with email
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="mb-0">
                Password
              </Label>
              <Link href="/forgot-password" className="text-xs font-medium text-accent">
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1.5" />
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" name="rememberMe" defaultChecked className="h-4 w-4 rounded border-border-strong accent-accent" />
            Remember me
          </label>

          <FieldError>{state.error}</FieldError>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Logging in…" : "Log In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          New to ClubSync?{" "}
          <Link href="/signup" className="font-medium text-accent">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
