import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Access Denied" };

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-0 px-6 text-center">
      <p className="text-4xl">🔒</p>
      <h1 className="mt-4 text-xl font-bold text-text-primary">Access Denied</h1>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">You do not have permission to access this page.</p>
      <Link href="/home" className="mt-6 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-on-accent">
        Back to ClubSync
      </Link>
    </div>
  );
}
