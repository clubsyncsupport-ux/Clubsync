"use client";

import Link from "next/link";
import "./globals.css";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col items-center justify-center bg-surface-0 px-6 py-12 text-center text-text-primary">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-danger to-warning shadow-lg">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 8.5v5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="0.9" fill="white" />
            <path
              d="M10.6 4.3 2.9 18.1c-.6 1 .1 2.3 1.3 2.3h15.6c1.2 0 1.9-1.3 1.3-2.3L13.4 4.3c-.6-1.1-2.2-1.1-2.8 0Z"
              stroke="white"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">ClubSync hit a snag</h1>
        <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-text-secondary">
          Something broke at the app level. Reloading usually fixes this.
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={() => unstable_retry()}
            className="w-full rounded-2xl bg-accent px-6 py-3.5 text-base font-medium text-on-accent shadow-sm"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full rounded-2xl border border-border bg-surface-2 px-6 py-3.5 text-base font-medium text-text-primary"
          >
            Go Home
          </Link>
        </div>
      </body>
    </html>
  );
}
