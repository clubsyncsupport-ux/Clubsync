"use client";

import { LinkButton, Button } from "@/components/ui/button";

export default function ErrorPage({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center animate-fade-in">
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
      <h1 className="text-[28px] font-bold tracking-tight text-text-primary">Something went wrong</h1>
      <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-text-secondary">
        That&apos;s on us, not you. Try again — if it keeps happening, come back later.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Button size="lg" className="w-full" onClick={() => unstable_retry()}>
          Try Again
        </Button>
        <LinkButton href="/" variant="secondary" size="lg" className="w-full">
          Go Home
        </LinkButton>
      </div>
    </div>
  );
}
