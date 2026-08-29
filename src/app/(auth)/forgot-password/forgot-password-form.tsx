import Link from "next/link";

// Password resets aren't self-service — see the note in
// src/lib/auth/types.ts for why. This is a static page rather than a form,
// since there's no email step left for a submission to actually trigger.
export function ForgotPasswordForm() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-0 px-6 py-10">
      <div className="mx-auto w-full max-w-sm flex-1 animate-fade-in">
        <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
          ← Back to log in
        </Link>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-text-primary">Reset your password</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Password resets aren&rsquo;t self-service yet. Ask a club director, your school&rsquo;s ClubSync admin, or your teacher to reset it for you from their admin panel — or reach out to ClubSync support directly.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-surface-1 p-4 text-sm text-text-secondary">
          <p className="font-medium text-text-primary">ClubSync support</p>
          <p className="mt-1">clubsyncsupport@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
