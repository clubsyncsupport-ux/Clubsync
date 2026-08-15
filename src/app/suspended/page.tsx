import type { Metadata } from "next";
import { logoutAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Account Suspended" };

export default function SuspendedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-0 px-6 text-center">
      <p className="text-4xl">🚫</p>
      <h1 className="mt-4 text-xl font-bold text-text-primary">Your account has been suspended</h1>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        A Platform Administrator has suspended this account. Contact your school&rsquo;s ClubSync administrator if you believe this is a
        mistake.
      </p>
      <form action={logoutAction} className="mt-6">
        <button type="submit" className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-primary">
          Sign Out
        </button>
      </form>
    </div>
  );
}
